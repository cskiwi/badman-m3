`RUN_MIGRATIONS=true npx ts-node -r tsconfig-paths/register --project libs/backend/database/tsconfig.json ./node_modules/typeorm/cli migration:run -d libs/backend/database/src/datasource`
