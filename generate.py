import os
import json
import random
import string
from datetime import datetime

# 1. 基础配置（这里你可以自己改）
BASE_DIR = "download"
CATEGORY = "tvbox"
MAX_SOURCES = 10  # 每个配置里最多放多少个源

# 2. 示例公开TVBox源（你可以后续自己加更多）
PUBLIC_SOURCES = [
    {"key": "douban", "name": "豆瓣影视", "api": "https://api.doubanapi.com/api/v2", "type": 3, "searchable": 1},
    {"key": "libvio", "name": "Libvio", "api": "https://www.libvioapi.com/api.php/provide/vod/", "type": 1, "searchable": 1},
    {"key": "cokemv", "name": "Cokemv", "api": "https://api.cokemvapi.com/api.php/provide/vod/", "type": 1, "searchable": 1},
    {"key": "ffzy", "name": "飞飞影视", "api": "https://api.ffzyapi.com/api.php/provide/vod/", "type": 1, "searchable": 1},
    {"key": "bilibili", "name": "B站影视", "api": "https://api.bilibiliapi.com/api.php/provide/vod/", "type": 1, "searchable": 1},
    {"key": "sohu", "name": "搜狐影视", "api": "https://api.sohuapi.com/api.php/provide/vod/", "type": 1, "searchable": 1},
]

# 3. 生成随机文件名（模仿 xpghz2.json 这种）
def random_filename(length=6):
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length)) + ".json"

# 4. 获取最新的ID（自增数字，模仿 5043）
def get_next_id():
    if not os.path.exists(BASE_DIR):
        return 1
    existing_ids = [int(d) for d in os.listdir(BASE_DIR) if d.isdigit()]
    return max(existing_ids) + 1 if existing_ids else 1

# 5. 生成标准TVBox配置JSON
def generate_tvbox_config():
    # 随机选一部分源
    selected_sources = random.sample(PUBLIC_SOURCES, min(MAX_SOURCES, len(PUBLIC_SOURCES)))
    config = {
        "spider": "",
        "sites": selected_sources,
        "parses": [
            {"name": "解析", "type": 1, "url": "https://jx.jsonplayer.com/player/?url="}
        ]
    }
    return config

# 6. 主流程
if __name__ == "__main__":
    next_id = get_next_id()
    dir_path = os.path.join(BASE_DIR, str(next_id), CATEGORY)
    os.makedirs(dir_path, exist_ok=True)

    config = generate_tvbox_config()
    filename = random_filename()
    file_path = os.path.join(dir_path, filename)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    print(f"✅ 配置文件已生成: {file_path}")
    print(f"🔗 访问地址示例: https://你的域名.pages.dev/{file_path}")
