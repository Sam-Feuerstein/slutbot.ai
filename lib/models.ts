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
    chargeId: { type: String, default: '', index: true },
    invoiceUrl: { type: String, default: '' },
  },
  { timestamps: true, collection: 'slutbotpayments' },
);

export const SlutbotPayment = models.SlutbotPayment || model('SlutbotPayment', slutbotPaymentSchema);

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
