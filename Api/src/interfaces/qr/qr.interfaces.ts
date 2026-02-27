import { Request, Response } from 'express';
import { IApiResponse } from '../../types/common.types';
import { IQRResolveResponse } from '../../types/qr.types';

/**
 * Interface para el controlador de QR
 */
export interface IQRController {
  resolveQR(
    req: Request,
    res: Response<IApiResponse<IQRResolveResponse>>
  ): Promise<Response<IApiResponse<IQRResolveResponse>>>;
  resolveByDNI(
    req: Request,
    res: Response<IApiResponse<IQRResolveResponse>>
  ): Promise<Response<IApiResponse<IQRResolveResponse>>>;
}

/**
 * Interface para el servicio de QR
 */
export interface IQRService {
  resolveByQRCode(qrCode: string): Promise<IQRResolveResponse>;
  resolveByDNI(dni: string): Promise<IQRResolveResponse>;
}
