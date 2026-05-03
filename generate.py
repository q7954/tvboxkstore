import os
import json
import random
import string

# 自动生成配置
def random_name(n=6):
    return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(n))

# 固定可用接口（稳定、可直接播放）
config = {
    "spider": "",
    "sites": [
        {"key": "libvio", "name": "🔵优质线路1", "api": "shturl.cc/G2K1aSfq360WqyMBN3dQWrIpFUyCSNxa", "type": 1, "searchable": 1},
        {"key": "ffzy", "name": "🔴优质线路2", "api": "https://www.ffzy.tv/api.php/provide/vod/", "type": 1, "searchable": 1},
        {"key": "ckzy", "name": "🟠高清秒播", "api": "https://www.ckzy.cc/api.php/provide/vod/", "type": 1, "searchable": 1},
        {"key": "wuxin", "name": "🟢无芯影视", "api": "shturl.cc/o1Gt1zfqavHAATvfZgMfjysVNikaR6cGg", "type": 1, "searchable": 1}
    ],
    "parses": [
        {"name": "官方解析", "type": 1, "url": "https://jx.jsonplayer.com/player/?url="}
    ]
}

# 生成目录结构（和 d.kstore.dev 一模一样）
os.makedirs("download/1/tvbox", exist_ok=True)
filename = f"download/1/tvbox/{random_name()}.json"

with open(filename, "w", encoding="utf-8") as f:
    json.dump(config, f, ensure_ascii=False, indent=2)

print("✅ 生成成功：", filename)
