namespace PRN232v1.Services.Profiles;

public class ProfileForbiddenException : Exception
{
    public ProfileForbiddenException(string message) : base(message)
    {
    }
}
