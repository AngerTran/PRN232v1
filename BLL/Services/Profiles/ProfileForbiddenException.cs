namespace BLL.Services.Profiles;

public class ProfileForbiddenException : Exception
{
    public ProfileForbiddenException(string message) : base(message)
    {
    }
}
