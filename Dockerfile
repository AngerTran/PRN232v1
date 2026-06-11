FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY BE/PRN232v1.csproj ./BE/
COPY BLL/BLL.csproj ./BLL/
COPY DAL/DAL.csproj ./DAL/

RUN dotnet restore ./BE/PRN232v1.csproj

COPY . .

RUN dotnet publish ./BE/PRN232v1.csproj -c Release -o /app/publish /p:UseAppHost=false


FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 3001

ENV ASPNETCORE_URLS=http://+:3001
ENV Swagger__Enabled=true
ENV Google__RedirectUri=http://146.190.94.40:3002/auth/google/callback
ENV Google__FrontendBaseUrl=http://146.190.94.40:3002

ENTRYPOINT ["dotnet", "PRN232v1.dll"]
