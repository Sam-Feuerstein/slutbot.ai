import { Schema, model, models } from 'mongoose';

const aiToolGenerationSchema = new Schema(
  {
    clientId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'SlutbotUser', default: null, index: true },
    mode: { type: String, enum: ['image', 'video'], required: true },
    videoModel: { type: String, enum: ['cheap', 'current'], default: null },
    sourceImageUrl: { type: String, required: true },
    outputUrl: { type: String, required: true },
    prompt: { type: String, default: '' },
    quality: { type: String, default: '' },
    duration: { type: Number, default: null },
  },
  { timestamps: true, collection: 'aitoolgenerations' },
);

export const AiToolGeneration =
  models.AiToolGeneration || model('AiToolGeneration', aiToolGenerationSchema);

const slutbotUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null, index: true, sparse: true },
    name: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    clientId: { type: String, required: true, unique: true, index: true },
    desires: { type: Number, default: 0 },
    banned: { type: Boolean, default: false },
    imageGens: { type: Number, default: 0 },
    videoGens: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'slutbotusers' },
);

export const SlutbotUser = models.SlutbotUser || model('SlutbotUser', slutbotUserSchema);

const slutbotWalletSchema = new Schema(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'SlutbotUser', default: null, index: true },
    desires: { type: Number, default: 0 },
    lastPaymentChargeId: { type: String, default: null },
  },
  { timestamps: true, collection: 'slutbotwallets' },
);

export const SlutbotWallet = models.SlutbotWallet || model('SlutbotWallet', slutbotWalletSchema);

const slutbotPaymentSchema = new Schema(
  {
    clientId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'SlutbotUser', default: null, index: true },
    planId: { type: String, required: true },
    provider: { type: String, enum: ['nowpayments', 'telegram_stars'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
    usdAmount: { type: Number, required: true },
    starsAmount: { type: Number, default: 0 },
    desires: { type: Number, required: true },
    orderId: { type: String, default: '', index: true },
    chargeId: { type: String, default: null },
    invoiceUrl: { type: String, default: '' },
    country: { type: String, default: '' },
    couponCode: { type: String, default: '' },
    couponType: { type: String, default: '' },
    couponDiscountPercent: { type: Number, default: 0 },
    couponDiscountUsd: { type: Number, default: 0 },
    walletCredited: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'slutbotpayments' },
);
slutbotPaymentSchema.index(
  { chargeId: 1 },
  { unique: true, partialFilterExpression: { chargeId: { $type: 'string', $gt: '' } } },
);

export const SlutbotPayment = models.SlutbotPayment || model('SlutbotPayment', slutbotPaymentSchema);

const generationJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'SlutbotUser', required: true, index: true },
    taskId: { type: String, default: null, unique: true, sparse: true },
    mode: { type: String, enum: ['image', 'video'], required: true },
    videoModel: { type: String, enum: ['cheap', 'current'], default: null },
    quality: { type: String, default: '' },
    duration: { type: Number, default: null },
    cost: { type: Number, required: true },
    status: {
      type: String,
      enum: ['charged', 'completed', 'failed', 'refunded'],
      default: 'charged',
      index: true,
    },
    sourceKey: { type: String, default: '' },
  },
  { timestamps: true, collection: 'generationjobs' },
);

export const GenerationJob = models.GenerationJob || model('GenerationJob', generationJobSchema);

const contentRemovalRequestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    contentUrl: { type: String, default: '', trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
  },
  { timestamps: true, collection: 'contentremovalrequests' },
);

export const ContentRemovalRequest =
  models.ContentRemovalRequest || model('ContentRemovalRequest', contentRemovalRequestSchema);

const platformSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'platform' },
    videoPrompt: { type: String, default: '' },
    imagePrompt: { type: String, default: '' },
    /** WaveSpeed video engine used for all public video generations. */
    videoEngine: {
      type: String,
      enum: ['wan_ultra_fast', 'ltx_spicy'],
      default: 'wan_ultra_fast',
    },
    starsGeoEnabled: { type: Boolean, default: true },
    starsGeoRoundUpTo: { type: Number, default: 50 },
  },
  { timestamps: true, collection: 'platformsettings' },
);

export const PlatformSettings =
  models.PlatformSettings || model('PlatformSettings', platformSettingsSchema);

const analyticsStatSchema = new Schema(
  {
    day: { type: String, default: '', index: true },
    name: { type: String, required: true, index: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'analyticsstats' },
);
analyticsStatSchema.index({ day: 1, name: 1 }, { unique: true });

export const AnalyticsStat = models.AnalyticsStat || model('AnalyticsStat', analyticsStatSchema);

const analyticsEventSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    kind: { type: String, enum: ['click', 'view', 'interaction'], default: 'interaction', index: true },
    path: { type: String, default: '' },
    label: { type: String, default: '' },
    plan: { type: String, default: '' },
    method: { type: String, default: '' },
    clientId: { type: String, default: '', index: true },
  },
  { timestamps: true, collection: 'analyticsevents' },
);
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const AnalyticsEvent = models.AnalyticsEvent || model('AnalyticsEvent', analyticsEventSchema);

const starsGeoRuleSchema = new Schema(
  {
    country: { type: String, required: true, unique: true, uppercase: true, index: true },
    name: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    mode: { type: String, enum: ['discount_percent', 'custom_stars'], default: 'discount_percent' },
    discountPercent: { type: Number, default: 0 },
    customStars: { type: Schema.Types.Mixed, default: {} },
    typicalUsdNote: { type: String, default: '' },
    roundUpTo: { type: Number, default: null },
  },
  { timestamps: true, collection: 'starsgeorules' },
);

export const StarsGeoRuleModel = models.StarsGeoRule || model('StarsGeoRule', starsGeoRuleSchema);

const slutbotCouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    label: { type: String, default: '' },
    type: {
      type: String,
      enum: ['percent_off', 'amount_off', 'credits', 'crypto_discount'],
      required: true,
      default: 'percent_off',
    },
    creditsAmount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountUsd: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    newUsersOnly: { type: Boolean, default: true },
    oncePerUser: { type: Boolean, default: true },
    maxRedemptions: { type: Number, default: null },
    redemptionCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true, collection: 'slutbotcoupons' },
);

export const SlutbotCoupon = models.SlutbotCoupon || model('SlutbotCoupon', slutbotCouponSchema);

const slutbotCouponRedemptionSchema = new Schema(
  {
    couponId: { type: Schema.Types.ObjectId, ref: 'SlutbotCoupon', required: true, index: true },
    code: { type: String, required: true, uppercase: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'SlutbotUser', required: true, index: true },
    clientId: { type: String, default: '', index: true },
    type: {
      type: String,
      enum: ['percent_off', 'amount_off', 'credits', 'crypto_discount'],
      required: true,
    },
    creditsGranted: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'slutbotcouponredemptions' },
);
slutbotCouponRedemptionSchema.index({ couponId: 1, userId: 1 }, { unique: true });

export const SlutbotCouponRedemption =
  models.SlutbotCouponRedemption || model('SlutbotCouponRedemption', slutbotCouponRedemptionSchema);
