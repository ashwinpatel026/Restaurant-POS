import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuMaster extends Document {
  name: string;
  details?: string;
  groups?: string[];
  taxes?: Array<{ name: string; rate: number; inclusive?: boolean }>;
  kitchen?: { preparationTime?: number; route?: string };
  reporting?: { plGroup?: string; salesAccount?: string; costAccount?: string };
  availability?: { days?: number[]; startTime?: string; endTime?: string };
  channels?: { dineIn: boolean; takeaway: boolean; delivery: boolean; qrOrder: boolean; happyHours?: boolean };
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const MenuMasterSchema = new Schema<IMenuMaster>(
  {
    name: { type: String, required: true, unique: true },
    details: String,
    groups: [{ type: String }],
    taxes: [{ name: String, rate: Number, inclusive: { type: Boolean, default: false } }],
    kitchen: { preparationTime: { type: Number, default: 15 }, route: String },
    reporting: { plGroup: String, salesAccount: String, costAccount: String },
    availability: { days: [{ type: Number }], startTime: String, endTime: String },
    channels: {
      dineIn: { type: Boolean, default: true },
      takeaway: { type: Boolean, default: true },
      delivery: { type: Boolean, default: true },
      qrOrder: { type: Boolean, default: true },
      happyHours: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

MenuMasterSchema.index({ sortOrder: 1 });

export default mongoose.models.MenuMaster || mongoose.model<IMenuMaster>('MenuMaster', MenuMasterSchema);


