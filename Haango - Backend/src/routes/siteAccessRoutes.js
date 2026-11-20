import { Router } from 'express';
import { lookupIpLocation } from '../services/ipGeolocationService.js';
import { isIndiaCountry } from '../services/siteAccessService.js';

const router = Router();

router.get('/', async (req, res) => {
  const location = await lookupIpLocation(req.ip || req.connection?.remoteAddress);
  res.json({
    success: true,
    data: {
      country: location?.country || null,
      allowed: location ? isIndiaCountry(location.country) : null,
    },
  });
});

export default router;
