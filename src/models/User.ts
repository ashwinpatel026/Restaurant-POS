import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OUTLET_MANAGER' | 'KITCHEN_MANAGER' | 'CAPTAIN' | 'WAITER' | 'CASHIER';
  isActive: boolean;
  outletId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'OUTLET_MANAGER', 'KITCHEN_MANAGER', 'CAPTAIN', 'WAITER', 'CASHIER'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet' },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ outletId: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

