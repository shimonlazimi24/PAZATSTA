-- Booking topics the admin adds on top of the built-in list. Additive only.
CREATE TABLE "BookingTopic" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingTopic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BookingTopic_label_key" ON "BookingTopic"("label");
