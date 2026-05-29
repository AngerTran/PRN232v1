using NpgsqlTypes;
namespace DAL.Common;
public enum ProfileRole
{
    [PgName("assistant")]
    Assistant,

    [PgName("mangaka")]
    Mangaka,

    [PgName("admin")]
    Admin,

    [PgName("editor")]
    Editor,

    [PgName("board")]
    Board
}

public static class ProfileRoles
{
    public const string Admin = "admin";
    public const string Mangaka = "mangaka";
    public const string Assistant = "assistant";
    public const string Editor = "editor";
    public const string Board = "board";

    public static string ToDbValue(ProfileRole role) => role switch
    {
        ProfileRole.Admin => Admin,
        ProfileRole.Mangaka => Mangaka,
        ProfileRole.Assistant => Assistant,
        ProfileRole.Editor => Editor,
        ProfileRole.Board => Board,
        _ => Assistant
    };

    public static bool TryParse(string? role, out ProfileRole profileRole)
    {
        profileRole = role?.Trim().ToLowerInvariant() switch
        {
            Admin => ProfileRole.Admin,
            Mangaka => ProfileRole.Mangaka,
            Assistant => ProfileRole.Assistant,
            Editor => ProfileRole.Editor,
            Board => ProfileRole.Board,
            _ => ProfileRole.Assistant
        };

        return role?.Trim().ToLowerInvariant() is Admin or Mangaka or Assistant or Editor or Board;
    }
}
