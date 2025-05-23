import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- CẤU HÌNH CÁC GIÁ TRỊ "UNKNOWN" CẦN XÓA ---
# Thay đổi các giá trị này cho phù hợp với dữ liệu của bạn
# Đây là danh sách các giá trị bạn coi là "unknown" cho artist
UNKNOWN_ARTIST_VALUES = ["Unknown Artist", "Unknown", "", None, "unknown artist"]
# Đây là danh sách các giá trị bạn coi là "unknown" cho cover
UNKNOWN_COVER_VALUES = ["Unknown Cover", "unknown_cover.jpg", "default_cover.png", "", None, "unknown cover"]
# ----------------------------------------------------

def cleanup_unknown_metadata():
    load_dotenv()

    MONGO_URI = os.getenv("MONGO_URI")
    DB_NAME = os.getenv("DB_NAME", "musicDB")
    SONGS_METADATA_COLLECTION = os.getenv("SONGS_METADATA_COLLECTION", "songs_metadata")

    if not MONGO_URI:
        logger.critical("CRITICAL ERROR: MONGO_URI not found in .env file or environment variables.")
        return

    try:
        logger.info(f"Connecting to MongoDB Atlas (Database: {DB_NAME})...")
        client = MongoClient(MONGO_URI)
        client.admin.command('ping') # Kiểm tra kết nối
        logger.info("✅ Successfully connected to MongoDB Atlas!")
        db = client[DB_NAME]
        songs_collection = db[SONGS_METADATA_COLLECTION]
        logger.info(f"Using database: '{DB_NAME}'")
        logger.info(f"Using metadata collection: '{SONGS_METADATA_COLLECTION}'")

        # ----- Xóa trường 'artist' nếu giá trị nằm trong UNKNOWN_ARTIST_VALUES -----
        query_artist = {"artist": {"$in": UNKNOWN_ARTIST_VALUES}}
        update_artist = {"$unset": {"artist": ""}} # Giá trị của "" không quan trọng, chỉ cần key "artist"
        
        logger.info(f"Finding documents with artist in {UNKNOWN_ARTIST_VALUES}...")
        # Đếm trước khi cập nhật (tùy chọn, để biết có bao nhiêu document bị ảnh hưởng)
        count_before_artist = songs_collection.count_documents(query_artist)
        logger.info(f"Found {count_before_artist} documents with 'unknown' artist values.")

        if count_before_artist > 0:
            result_artist = songs_collection.update_many(query_artist, update_artist)
            logger.info(f"Removed 'artist' field from {result_artist.modified_count} documents.")
        else:
            logger.info("No documents found with 'unknown' artist values to update.")

        # ----- Xóa trường 'cover' nếu giá trị nằm trong UNKNOWN_COVER_VALUES -----
        query_cover = {"cover": {"$in": UNKNOWN_COVER_VALUES}}
        update_cover = {"$unset": {"cover": ""}} # Giá trị của "" không quan trọng, chỉ cần key "cover"

        logger.info(f"Finding documents with cover in {UNKNOWN_COVER_VALUES}...")
        # Đếm trước khi cập nhật
        count_before_cover = songs_collection.count_documents(query_cover)
        logger.info(f"Found {count_before_cover} documents with 'unknown' cover values.")

        if count_before_cover > 0:
            result_cover = songs_collection.update_many(query_cover, update_cover)
            logger.info(f"Removed 'cover' field from {result_cover.modified_count} documents.")
        else:
            logger.info("No documents found with 'unknown' cover values to update.")

        logger.info("Metadata cleanup process finished.")

    except ConnectionFailure as e:
        logger.critical(f"❌ Failed to connect to MongoDB Atlas: {e}")
    except Exception as e:
        logger.critical(f"❌ Unexpected error during cleanup: {e}", exc_info=True)
    finally:
        if 'client' in locals() and client:
            client.close()
            logger.info("MongoDB connection closed.")

if __name__ == "__main__":
    logger.info("--- Starting Metadata Cleanup Script ---")
    # QUAN TRỌNG: Sao lưu dữ liệu trước khi chạy script này!
    # confirmation = input("Bạn có chắc chắn muốn tiếp tục và xóa các trường 'artist'/'cover' không xác định? (yes/no): ")
    # if confirmation.lower() == 'yes':
    #     cleanup_unknown_metadata()
    # else:
    #     logger.info("Hủy bỏ thao tác bởi người dùng.")
    
    # Bỏ comment phần confirmation ở trên nếu muốn có bước xác nhận trước khi chạy
    # Hiện tại, script sẽ chạy trực tiếp khi được gọi
    cleanup_unknown_metadata()