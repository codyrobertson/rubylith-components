#\!/bin/bash

# Create test database for Vitest tests
echo "Creating test database..."

# Create temporary schema file
cat prisma/schema.prisma | sed 's|url.*=.*"file:./dev.db"|url = "file:./test.db"|' > prisma/test-schema.prisma

# Run Prisma db push
npx prisma db push --force-reset --skip-generate --schema=prisma/test-schema.prisma

# Clean up
rm -f prisma/test-schema.prisma

echo "Test database created at prisma/test.db"
