namespace DAL.Common;

/// <summary>
/// Quy tắc luồng nghiệp vụ linh hoạt:
/// - Mangaka sản xuất sau khi hội đồng duyệt.
/// - Lead lên lịch XB khi đã duyệt; có thể dời lịch bất cứ lúc nào (không khóa cứng).
/// - "Completed" = Editor báo sẵn sàng XB (một lần) — không khóa sản xuất/dời lịch.
/// </summary>
public static class SeriesWorkflowRules
{
    /// <summary>Gợi ý số chương nên có trước khi phát hành kỳ đầu (mềm — không chặn).</summary>
    public const int SuggestedReadyChaptersBeforeFirstPublish = 5;

    public static bool AllowsStudioProduction(SeriesStatus status) =>
        status is SeriesStatus.Approved
            or SeriesStatus.Publishing
            or SeriesStatus.Hiatus
            or SeriesStatus.Completed;

    public static bool AllowsProposalChapter(SeriesStatus status) =>
        status == SeriesStatus.Draft;

    public static bool AllowsPublishingSchedule(SeriesStatus status) =>
        status is SeriesStatus.Approved
            or SeriesStatus.Publishing
            or SeriesStatus.Hiatus
            or SeriesStatus.Completed;

    public static bool AllowsChapterCreation(SeriesStatus status, int chapterNumber)
    {
        if (chapterNumber == 0)
        {
            return AllowsProposalChapter(status);
        }

        return AllowsStudioProduction(status);
    }

    public static void EnsureAllowsChapterCreation(SeriesStatus status, int chapterNumber)
    {
        if (AllowsChapterCreation(status, chapterNumber))
        {
            return;
        }

        if (status == SeriesStatus.PendingReview)
        {
            throw new InvalidOperationException("Series đang chờ hội đồng xét duyệt — không thể thêm nội dung sản xuất.");
        }

        if (chapterNumber == 0)
        {
            throw new InvalidOperationException("Bản thảo đề xuất chỉ được tải lên khi series còn ở trạng thái nháp.");
        }

        throw new InvalidOperationException("Series chưa được hội đồng phê duyệt — không thể sản xuất chương.");
    }

    public static void EnsureAllowsStudioProduction(SeriesStatus status)
    {
        if (AllowsStudioProduction(status))
        {
            return;
        }

        if (status == SeriesStatus.PendingReview)
        {
            throw new InvalidOperationException("Series đang chờ hội đồng xét duyệt — không thể tiếp tục sản xuất.");
        }

        throw new InvalidOperationException("Series chưa được hội đồng phê duyệt — không thể sản xuất.");
    }

    public static void EnsureAllowsPublishingSchedule(SeriesStatus status)
    {
        if (AllowsPublishingSchedule(status))
        {
            return;
        }

        throw new InvalidOperationException("Chỉ có thể lên lịch xuất bản khi series đã được hội đồng phê duyệt.");
    }
}
