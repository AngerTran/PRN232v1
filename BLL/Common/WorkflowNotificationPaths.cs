namespace BLL.Common;

public static class WorkflowNotificationPaths
{
    public const string CategorySubmission = "submission_update";
    public const string CategorySystem = "system";
    public const string CategoryRanking = "ranking_alert";

    public static string MangakaSeries(Guid seriesId) => $"/mangaka/series/{seriesId}";

    public static string MangakaSeriesRanking(Guid seriesId) => $"/mangaka/series/{seriesId}/ranking";

    public static string EditorSeries(Guid seriesId) => $"/editor/series/{seriesId}";

    public static string BoardSubmission(Guid seriesId) => $"/board/submissions/{seriesId}";

    public static string BoardApprovedSeries(Guid seriesId) => $"/board/approved-series/{seriesId}";

    public static string BoardSchedule(Guid seriesId) => $"/board/publishing-schedule/{seriesId}";

    public static string BoardReviewInvitations() => "/board/submissions";

    public static string BoardSeriesDecisions() => "/board/series-decisions";

    /// <summary>Editor được Board gán trực tiếp — không còn trang lời mời riêng.</summary>
    public static string EditorInvitations() => "/editor/series";
}
