import { Request, Response } from 'express';
import { IQRController } from 'interfaces/qr';
import { qrService } from '../services/qr.service';

export class QRController implements IQRController {

  async resolveQR(req: Request, res: Response) {
    const { qr } = req.params;

    const data = await qrService.resolveByQRCode(qr);

    return res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  }

  async resolveByDNI(req: Request, res: Response) {
    const { dni } = req.params;

    const data = await qrService.resolveByDNI(dni);

    return res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

export const qrController = new QRController();
export default qrController;
