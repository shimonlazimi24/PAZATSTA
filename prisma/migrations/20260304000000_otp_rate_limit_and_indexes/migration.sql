-- CreateTable
CREATE TABLE "OtpRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpRequest_email_createdAt_idx" ON "OtpRequest"("email", "createdAt");

-- CreateIndex
CREATE INDEX "OtpRequest_ip_createdAt_idx" ON "OtpRequest"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "LoginCode_email_idx" ON "LoginCode"("email");

-- CreateIndex
CREATE INDEX "LoginCode_expiresAt_idx" ON "LoginCode"("expiresAt");
