import mongoose, { Schema, Document } from 'mongoose';

export interface IReservation extends Document {
  tableId: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  guestCount: number;
  reservationDate: Date;
  reservationTime: string;
  duration: number;
  specialRequest?: string;
  status: string;
  createdById: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: { type: String },
    guestCount: { type: Number, required: true },
    reservationDate: { type: Date, required: true },
    reservationTime: { type: String, required: true },
    duration: { type: Number, default: 120 },
    specialRequest: { type: String },
    status: { type: String, default: 'PENDING' },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

ReservationSchema.index({ tableId: 1 });
ReservationSchema.index({ reservationDate: 1 });
ReservationSchema.index({ status: 1 });

export default mongoose.models.Reservation || mongoose.model<IReservation>('Reservation', ReservationSchema);

