namespace DAL.Common;

/// <summary>
/// Quy tắc luồng nghiệp vụ: mangaka chỉ sản xuất sau khi hội đồng duyệt;
/// hội đồng chỉ lên lịch xuất bản khi editor đánh dấu hoàn thành.
/// </summary>
public static class SeriesWorkflowRules
{
    public static bool AllowsStudioProduction(SeriesStatus status) =>
        status is SeriesStatus.Approved or SeriesStatus.Publishing or SeriesStatus.Hiatus;

    public static bool AllowsProposalChapter(SeriesStatus status) =>
        status == SeriesStatus.Draft;

    public static bool AllowsPublishingSchedule(SeriesStatus status) =>
        status == SeriesStatus.Completed;

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

        if (status == SeriesStatus.Completed)
        {
            throw new InvalidOperationException("Series đã hoàn thành — không thể tiếp tục sản xuất.");
        }

        throw new InvalidOperationException("Series chưa được hội đồng phê duyệt — không thể sản xuất.");
    }

    public static void EnsureAllowsPublishingSchedule(SeriesStatus status)
    {
        if (AllowsPublishingSchedule(status))
        {
            return;
        }

        throw new InvalidOperationException("Chỉ có thể lên lịch xuất bản khi editor đã đánh dấu series hoàn thành.");
    }
}
