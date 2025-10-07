import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  categoryId: mongoose.Types.ObjectId;
  masterId?: mongoose.Types.ObjectId;
  price: number;
  cost?: number;
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
  isActive: boolean;
  preparationTime: number;
  tags: string[];
  nutritionInfo?: any;
  sortOrder: number;
  taxes?: Array<{ name: string; rate: number; inclusive?: boolean }>;
  reporting?: {
    plGroup?: string;
    salesAccount?: string;
    costAccount?: string;
  };
  modifiers?: mongoose.Types.ObjectId[]; // links to Modifier groups
  channels?: {
    dineIn: boolean;
    takeaway: boolean;
    delivery: boolean;
    qrOrder: boolean;
    happyHours?: boolean;
  };
  availability?: {
    days?: number[];
    startTime?: string;
    endTime?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true },
    description: { type: String },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    masterId: { type: Schema.Types.ObjectId, ref: 'MenuMaster' },
    price: { type: Number, required: true },
    cost: { type: Number },
    imageUrl: { type: String },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    preparationTime: { type: Number, default: 15 },
    tags: [{ type: String }],
    nutritionInfo: { type: Schema.Types.Mixed },
    sortOrder: { type: Number, default: 0 },
    taxes: [{ name: String, rate: Number, inclusive: { type: Boolean, default: false } }],
    reporting: {
      plGroup: String,
      salesAccount: String,
      costAccount: String,
    },
    modifiers: [{ type: Schema.Types.ObjectId, ref: 'Modifier' }],
    channels: {
      dineIn: { type: Boolean, default: true },
      takeaway: { type: Boolean, default: true },
      delivery: { type: Boolean, default: true },
      qrOrder: { type: Boolean, default: true },
      happyHours: { type: Boolean, default: false },
    },
    availability: {
      days: [{ type: Number }],
      startTime: String,
      endTime: String,
    },
  },
  {
    timestamps: true,
  }
);

MenuItemSchema.index({ categoryId: 1 });
MenuItemSchema.index({ isAvailable: 1 });
MenuItemSchema.index({ masterId: 1 });

export default mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);

