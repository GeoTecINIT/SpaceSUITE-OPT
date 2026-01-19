import { OccupationalProfile } from './occupationalProfile';

export interface PdfWorkerPayload {
  profile: OccupationalProfile;
  scaleFactor: number;
  assets: {
    poppinsRegular?: string;
    poppinsBold?: string;
    poppinsItalic?: string;
    watermark?: string;
    euLogo?: string;
    spaceSuiteLogo?: string;
  };
}
