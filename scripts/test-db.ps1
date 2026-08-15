$ErrorActionPreference = "Stop"

$containerName = "vatexpense-test-db"
$dbUrl = "postgres://postgres:postgres@localhost:5430/vatexpense_test"

Write-Host "Starting test database (PostgreSQL 18)..."
docker run -d --name $containerName -e POSTGRES_DB=vatexpense_test -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5430:5432 --tmpfs /var/lib/postgresql/18/docker postgres:18

Write-Host "Waiting for database to be ready..."
$maxRetries = 30
$retries = 0
while ($retries -lt $maxRetries) {
    $ready = docker exec $containerName pg_isready -U postgres 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database is ready."
        break
    }
    $retries++
    Start-Sleep -Seconds 1
}
if ($retries -eq $maxRetries) {
    Write-Host "ERROR: Database failed to start within 30 seconds."
    docker stop $containerName; docker rm $containerName
    exit 1
}

Write-Host "Applying schema..."
$env:DATABASE_URL = $dbUrl
pnpm db:push

Write-Host "Running tests..."
pnpm test:run
$testExit = $LASTEXITCODE

Write-Host "Stopping test database..."
docker stop $containerName; docker rm $containerName

if ($testExit -ne 0) {
    Write-Host "ERROR: Tests failed with exit code $testExit"
    exit $testExit
}

Write-Host "All tests passed."
exit 0
