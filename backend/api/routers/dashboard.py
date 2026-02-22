from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import date, timedelta

from database import get_db, get_dict_db
from models import WordExt, MediaResource
from schemas import DashboardResponse

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)

@router.get("/stats", response_model=DashboardResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    dict_db: Session = Depends(get_dict_db)
):
    # 1. Word Stats (from dict_db)
    total_words = dict_db.query(func.count(WordExt.vc_id)).scalar() or 0
    no_image = (
        dict_db.query(func.count(WordExt.vc_id))
        .filter(or_(WordExt.image_url.is_(None), WordExt.image_url == ""))
        .scalar()
        or 0
    )
    local_image = (
        dict_db.query(func.count(WordExt.vc_id))
        .filter(WordExt.image_url.like("/uploads/%"))
        .scalar()
        or 0
    )
    remote_image = max(int(total_words) - int(no_image) - int(local_image), 0)
    
    image_coverage = 0
    if int(total_words) > 0:
        image_coverage = round((int(total_words) - int(no_image)) * 100 / int(total_words), 2)

    # Word From Chart
    word_from_rows = (
        dict_db.query(WordExt.word_from, func.count(WordExt.vc_id))
        .group_by(WordExt.word_from)
        .order_by(func.count(WordExt.vc_id).desc())
        .limit(10)
        .all()
    )
    word_from_labels = [(r[0] or "Unknown") for r in word_from_rows]
    word_from_values = [int(r[1]) for r in word_from_rows]

    # 2. Media Stats (from db)
    total_video = db.query(func.count(MediaResource.id)).filter(MediaResource.media_type == "video").scalar() or 0
    total_audio = db.query(func.count(MediaResource.id)).filter(MediaResource.media_type == "audio").scalar() or 0
    total_media = int(total_video) + int(total_audio)

    # Directories
    def get_top_dirs(m_type):
        rows = (
            db.query(MediaResource.directory, func.count(MediaResource.id))
            .filter(MediaResource.media_type == m_type)
            .group_by(MediaResource.directory)
            .order_by(func.count(MediaResource.id).desc())
            .limit(10)
            .all()
        )
        return [(r[0] or "Uncategorized") for r in rows], [int(r[1]) for r in rows]

    video_dir_labels, video_dir_values = get_top_dirs("video")
    audio_dir_labels, audio_dir_values = get_top_dirs("audio")

    # Location
    location_rows = (
        db.query(MediaResource.location_type, func.count(MediaResource.id))
        .group_by(MediaResource.location_type)
        .all()
    )
    location_labels = [(r[0] or "Unknown") for r in location_rows]
    location_values = [int(r[1]) for r in location_rows]

    # Trend (Last 30 days)
    start = date.today() - timedelta(days=29)
    daily_rows = (
        db.query(
            func.date(MediaResource.created_at).label("d"),
            MediaResource.media_type,
            func.count(MediaResource.id),
        )
        .filter(MediaResource.created_at >= start)
        .group_by("d", MediaResource.media_type)
        .all()
    )
    
    daily_map = {}
    for d, t, c in daily_rows:
        if not d: continue
        ds = d.isoformat() if hasattr(d, "isoformat") else str(d)
        if ds not in daily_map: daily_map[ds] = {"video": 0, "audio": 0}
        daily_map[ds][t] = int(c)

    trend_labels = []
    trend_video = []
    trend_audio = []
    for i in range(30):
        day = (start + timedelta(days=i)).isoformat()
        trend_labels.append(day)
        trend_video.append(daily_map.get(day, {}).get("video", 0))
        trend_audio.append(daily_map.get(day, {}).get("audio", 0))

    return {
        "stats": {
            "total_words": total_words,
            "total_media": total_media,
            "total_video": total_video,
            "total_audio": total_audio,
            "no_image_words": no_image,
            "local_image_words": local_image,
            "remote_image_words": remote_image,
            "image_coverage": image_coverage,
        },
        "charts": {
            "word_image": {
                "labels": ["Missing", "Local", "Remote"],
                "values": [no_image, local_image, remote_image]
            },
            "word_from": {"labels": word_from_labels, "values": word_from_values},
            "media_type": {"labels": ["Video", "Audio"], "values": [total_video, total_audio]},
            "video_dir": {"labels": video_dir_labels, "values": video_dir_values},
            "audio_dir": {"labels": audio_dir_labels, "values": audio_dir_values},
            "media_location": {"labels": location_labels, "values": location_values},
            "media_trend": {
                "labels": trend_labels,
                "values": [] # Not used, special structure
            }, 
            # Note: Pydantic schema for media_trend is dict, so we can pass custom structure
        }
    }
    # Hack: Inject the custom structure for trend chart
    # The response validation will pass because media_trend is defined as dict in schema
    res = {
        "stats": {
            "total_words": total_words,
            "total_media": total_media,
            "total_video": total_video,
            "total_audio": total_audio,
            "no_image_words": no_image,
            "local_image_words": local_image,
            "remote_image_words": remote_image,
            "image_coverage": image_coverage,
        },
        "charts": {
            "word_image": {
                "labels": ["Missing", "Local", "Remote"],
                "values": [no_image, local_image, remote_image]
            },
            "word_from": {"labels": word_from_labels, "values": word_from_values},
            "media_type": {"labels": ["Video", "Audio"], "values": [total_video, total_audio]},
            "video_dir": {"labels": video_dir_labels, "values": video_dir_values},
            "audio_dir": {"labels": audio_dir_labels, "values": audio_dir_values},
            "media_location": {"labels": location_labels, "values": location_values},
            "media_trend": {
                "labels": trend_labels,
                "video": trend_video,
                "audio": trend_audio
            }
        }
    }
    return res
