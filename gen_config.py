import os
import json
import random
import string

def random_name(n=6):
    return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(n))

# 固定可用接口（稳定、可直接播放）
config = {
    "spider": "",
    "sites": [
        {"key": "libvio", "name": "🔵优质线路1", "api": "https://shturl.cc/G2K1aSfq360WqyMBN3dQWrIpFUyCSNxa", "type": 1, "searchable": 1},
        {"key": "ffzy", "name": "🔴优质线路2", "api": "https://www.ffzy.tv/api.php/provide/vod/", "type": 1, "searchable": 1},
        {"key": "ckzy", "name": "🟠高清秒播", "api": "https://www.ckzy.cc/api.php/provide/vod/", "type": 1, "searchable": 1},
        {"key": "wuxin", "name": "🟢无芯影视", "api": "https://shturl.cc/o1Gt1zfqavHAATvfZgMfjysVNikaR6cGg", "type": 1, "searchable": 1}
    ],
    "parses": [
        {"name": "官方解析", "type": 1, "url": "https://jx.jsonplayer.com/player/?url="}
    ]
}

# 生成目录结构（和 d.kstore.dev 一模一样）
base_dir = r"C:\Users\Administrator\WorkBuddy\20260503153849\tvbox-config"
os.makedirs(os.path.join(base_dir, "download/1/tvbox"), exist_ok=True)
filename = os.path.join(base_dir, f"download/1/tvbox/{random_name()}.json")

with open(filename, "w", encoding="utf-8") as f:
    json.dump(config, f, ensure_ascii=False, indent=2)

print("✅ 生成成功：", filename)
print("\n--- 文件内容预览 ---")
with open(filename, "r", encoding="utf-8") as f:
    print(f.read())
