from flask import Flask, jsonify, Response, stream_with_context, request, render_template
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from gridfs import GridFS, NoFile
from bson import ObjectId 
from bson.errors import InvalidId
from dotenv import load_dotenv
import os
import logging
import math 

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv() 

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "musicDB") 
SONGS_METADATA_COLLECTION = os.getenv("SONGS_METADATA_COLLECTION", "songs_metadata")
GRIDFS_COLLECTION = os.getenv("GRIDFS_COLLECTION", "fs") 

if not MONGO_URI:
    logger.critical("CRITICAL ERROR: MONGO_URI not found in .env file or environment variables.")
    exit("Exiting due to missing MongoDB connection URI.")

app = Flask(__name__)
CORS(app) 

try:
    logger.info(f"Connecting to MongoDB Atlas (Database: {DB_NAME})...")
    client = MongoClient(MONGO_URI)
    client.admin.command('ping')
    logger.info("✅ Successfully connected to MongoDB Atlas!")
    db = client[DB_NAME]
    fs = GridFS(db, collection=GRIDFS_COLLECTION)
    songs_collection = db[SONGS_METADATA_COLLECTION]
    logger.info(f"Using database: '{DB_NAME}'")
    logger.info(f"Using metadata collection: '{SONGS_METADATA_COLLECTION}'")
    logger.info(f"Using GridFS collection prefix: '{GRIDFS_COLLECTION}'")

except (ConnectionFailure) as e:
    logger.critical(f"❌ Failed to connect to MongoDB Atlas: {e}")
    exit(f"Database connection failed: {e}")
except Exception as e:
     logger.critical(f"❌ Unexpected error during MongoDB initialization: {e}", exc_info=True)
     exit(f"Unexpected database initialization error: {e}")

@app.route('/')
def index():
    return render_template('index.html') 

@app.route('/guest')
def guest():
    return render_template('guest.html')

@app.route('/api/songs', methods=['GET'])
def get_songs():
    """Lấy danh sách metadata của các bài hát từ MongoDB."""
    logger.info("Received request for /api/songs")
    try:
        song_list = []
        projection = {"_id": 1, "name": 1, "artist": 1, "cover": 1, "source": 1, "filename": 1, "gridfs_id": 1}
        for song in songs_collection.find({}, projection):
            # Validate gridfs_id
            gridfs_id_str = str(song.get('gridfs_id', ''))
            try:
                if gridfs_id_str:
                    fs.get(ObjectId(gridfs_id_str))
                else:
                    logger.warning(f"Missing gridfs_id for song: {song.get('name', 'Unknown')}")
                    continue  # Skip songs without valid gridfs_id
            except NoFile:
                logger.warning(f"GridFS file not found for gridfs_id: {gridfs_id_str}")
                continue  # Skip songs with invalid gridfs_id

            song_data = {
                '_id': str(song['_id']),
                'gridfs_id': gridfs_id_str,
                'name': song.get('name', 'Unknown Track'),
                'artist': song.get('artist', 'Unknown Artist'),
                'cover': song.get('cover', 'https://via.placeholder.com/100'),
                'source': song.get('source', 'api'),
                'filename': song.get('filename', ''),
                'url': f"/api/songs/stream/{gridfs_id_str}" if gridfs_id_str else ''
            }
            song_list.append(song_data)

        if not song_list:
            logger.warning("No valid songs found in metadata collection")
            return jsonify([]), 200

        logger.info(f"Returning {len(song_list)} songs from metadata collection.")
        return jsonify(song_list)
    except Exception as e:
        logger.error(f"Error fetching song list from MongoDB: {e}", exc_info=True)
        return jsonify({"error": "Could not retrieve song list from database"}), 500

@app.route('/api/songs/stream/<gridfs_id_str>', methods=['GET'])
def stream_song(gridfs_id_str):
    """Stream nội dung file âm thanh từ GridFS dựa vào gridfs_id."""
    logger.info(f"Received stream request for GridFS ID: {gridfs_id_str}")
    try:
        gridfs_id = ObjectId(gridfs_id_str)
    except InvalidId:
        logger.warning(f"Invalid ObjectId format received: {gridfs_id_str}")
        return jsonify({"error": "Invalid song ID format"}), 400

    try:
        grid_out = fs.get(gridfs_id)
        logger.debug(f"Found GridFS file: {grid_out.filename}, Length: {grid_out.length}, ContentType: {grid_out.content_type}")

        range_header = request.headers.get('Range', None)
        file_size = grid_out.length
        start = 0
        end = file_size - 1

        if range_header:
            logger.debug(f"Range header detected: {range_header}")
            try:
                range_str = range_header.replace('bytes=', '').strip()
                parts = range_str.split('-')
                start = int(parts[0])
                if len(parts) > 1 and parts[1]:
                    end = int(parts[1])
                else:
                     pass 

                end = min(end, file_size - 1)
                logger.debug(f"Parsed Range: start={start}, end={end}")

            except ValueError:
                logger.error(f"Invalid Range header format: {range_header}")
                return jsonify({"error": "Invalid Range header format"}), 416

            if start < 0 or start >= file_size or start > end:
                 logger.error(f"Invalid range requested: start={start}, end={end}, file_size={file_size}")
                 return jsonify({"error": "Requested range is not valid"}), 416

        chunk_size = 1024 * 512 
        length = end - start + 1 

        def generate_chunks():
            bytes_yielded = 0
            try:
                grid_out.seek(start)
                while bytes_yielded < length:
                    read_now = min(chunk_size, length - bytes_yielded)
                    data = grid_out.read(read_now)
                    if not data:
                        logger.warning(f"GridFS read returned no data unexpectedly at position {start + bytes_yielded} for ID {gridfs_id_str}")
                        break 
                    yield data
                    bytes_yielded += len(data)
            except Exception as e:
                logger.error(f"Error during chunk generation for {gridfs_id_str}: {e}", exc_info=True)
            finally:
                 grid_out.close() 
                 logger.debug(f"Closed GridFS stream for {gridfs_id_str}")


        response = Response(stream_with_context(generate_chunks()), mimetype=grid_out.content_type or "audio/mpeg")

        response.headers['Content-Length'] = str(length)
        response.headers['Accept-Ranges'] = 'bytes'

        if range_header:
            response.headers['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response.status_code = 206
            logger.info(f"Responding with 206 Partial Content for range {start}-{end} ({length} bytes) for ID {gridfs_id_str}")
        else:
            response.status_code = 200
            logger.info(f"Responding with 200 OK (full content or initial request) ({length} bytes) for ID {gridfs_id_str}")

        return response

    except NoFile:
        logger.warning(f"GridFS file not found for ID: {gridfs_id_str}")
        return jsonify({"error": "Song file not found in storage"}), 404
    except Exception as e:
        logger.error(f"Error streaming song {gridfs_id_str}: {e}", exc_info=True)
        return jsonify({"error": "Server error while streaming song"}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000)) 
    host = os.getenv("HOST", "127.0.0.1")

    logger.info(f"--- Starting DJ App Backend (MongoDB Version) ---")
    logger.info(f"Server will run on http://{host}:{port}")
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)  
