import mongoose, { Schema, Document } from 'mongoose';

export interface IOutlet extends Document {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  openingTime: string;
  closingTime: string;
  createdAt: Date;
  updatedAt: Date;
}

const OutletSchema = new Schema<IOutlet>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    latitude: { type: Number },
    longitude: { type: Number },
    isActive: { type: Boolean, default: true },
    openingTime: { type: String, required: true },
    closingTime: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

OutletSchema.index({ code: 1 });

export default mongoose.models.Outlet || mongoose.model<IOutlet>('Outlet', OutletSchema);

