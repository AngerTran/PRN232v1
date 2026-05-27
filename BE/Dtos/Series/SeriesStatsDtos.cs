namespace PRN232v1.Dtos.Series;

public record SeriesStatsResponse(
    Guid SeriesId,
    string Title,
    string Status,
    int ChapterCount,
    int PageCount,
    SeriesRankingItemResponse? LatestRanking,
    int BoardVoteCount,
    int ApproveVotes,
    int RejectVotes,
    int ScheduleCount,
    bool InDangerZone);
