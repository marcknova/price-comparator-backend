-- CreateTable
CREATE TABLE "Product" (
    "uuid" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "storage" TEXT,
    "color" TEXT,
    "image_url" TEXT NOT NULL,
    "category" TEXT,
    "search_text" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL DEFAULT 'MX',
    "api_endpoint" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "time" TIMESTAMPTZ NOT NULL,
    "product_uuid" UUID NOT NULL,
    "store_id" INTEGER NOT NULL,
    "price_amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "is_current" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("time","product_uuid","store_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_name_key" ON "Store"("name");

-- CreateIndex
CREATE INDEX "Price_product_uuid_time_idx" ON "Price"("product_uuid", "time" DESC);

-- CreateIndex
CREATE INDEX "Price_store_id_idx" ON "Price"("store_id");

-- CreateIndex
CREATE INDEX "Price_currency_idx" ON "Price"("currency");

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_product_uuid_fkey" FOREIGN KEY ("product_uuid") REFERENCES "Product"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
