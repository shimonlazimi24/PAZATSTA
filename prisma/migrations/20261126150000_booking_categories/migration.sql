-- Booking cards (tracks) the admin adds, each with its own topics. Additive only.
CREATE TABLE "BookingCategory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BookingCategory_title_key" ON "BookingCategory"("title");
