import mongoose, { Schema, Document } from 'mongoose';

export interface IModifierItem {
  name: string;
  price?: number;
  isDefault?: boolean;
  isActive: boolean;
}

export interface IModifier extends Document {
  name: string;
  description?: string;
  type?: 'single' | 'multiple';
  minSelect?: number;
  maxSelect?: number;
  items: IModifierItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ModifierItemSchema = new Schema<IModifierItem>({
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { _id: true });

const ModifierSchema = new Schema<IModifier>({
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['single', 'multiple'], default: 'multiple' },
  minSelect: { type: Number, default: 0 },
  maxSelect: { type: Number, default: 0 },
  items: [ModifierItemSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Modifier || mongoose.model<IModifier>('Modifier', ModifierSchema);


