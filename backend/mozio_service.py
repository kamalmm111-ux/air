"""
Mozio B2B Integration Service
Sends driver and vehicle information to Mozio for their customers' bookings
"""

import os
import logging
import httpx
from typing import Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Mozio API Configuration
MOZIO_PRODUCTION_URL = "https://api.mozio.com"
MOZIO_STAGING_URL = "https://api-staging-internal.mozio.com"

# Use staging for testing, production for live
MOZIO_API_URL = os.environ.get("MOZIO_API_URL", MOZIO_STAGING_URL)
MOZIO_PROVIDER_TYPE = os.environ.get("MOZIO_PROVIDER_TYPE", "MZ Drive UK")

# Enable/disable Mozio integration
MOZIO_ENABLED = os.environ.get("MOZIO_ENABLED", "true").lower() == "true"


async def send_driver_info_to_mozio(
    external_id: str,
    driver: Dict,
    vehicle: Optional[Dict] = None,
    booking: Optional[Dict] = None
) -> Dict:
    """
    Send driver and vehicle information to Mozio API
    
    Args:
        external_id: Mozio's booking reference number
        driver: Driver information dict
        vehicle: Vehicle information dict (optional)
        booking: Booking data for additional context (optional)
    
    Returns:
        Dict with status and response data
    """
    if not MOZIO_ENABLED:
        logger.info(f"[MOZIO] Integration disabled - skipping for external_id: {external_id}")
        return {"status": "disabled", "message": "Mozio integration is disabled"}
    
    if not external_id:
        logger.warning("[MOZIO] No external_id provided - cannot send to Mozio")
        return {"status": "error", "message": "No Mozio external_id provided"}
    
    # Build driver payload
    driver_payload = {}
    if driver:
        driver_payload = {
            "name": driver.get("name", ""),
            "phone": driver.get("phone", ""),
        }
        if driver.get("photo_url"):
            driver_payload["photo_url"] = driver["photo_url"]
        if driver.get("license_number"):
            driver_payload["license_plate"] = driver["license_number"]
    
    # Build vehicle payload
    vehicle_payload = {}
    if vehicle:
        vehicle_payload = {
            "make": vehicle.get("make", vehicle.get("manufacturer", "")),
            "model": vehicle.get("model", ""),
            "color": vehicle.get("color", ""),
            "license_plate": vehicle.get("plate_number", vehicle.get("plate", "")),
        }
        if vehicle.get("image_url"):
            vehicle_payload["photo_url"] = vehicle["image_url"]
        if vehicle.get("description"):
            vehicle_payload["description"] = vehicle["description"]
        if vehicle.get("vehicle_type"):
            vehicle_payload["vehicle_type"] = vehicle["vehicle_type"]
    
    # Build full request payload
    payload = {
        "provider_type": MOZIO_PROVIDER_TYPE,
        "external_id": external_id,
        "driver": driver_payload,
        "vehicle": vehicle_payload
    }
    
    logger.info(f"[MOZIO] Sending driver info for external_id: {external_id}")
    logger.debug(f"[MOZIO] Payload: {payload}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{MOZIO_API_URL}/v2/reservations/provider/driver/",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )
            
            if response.status_code == 201:
                logger.info(f"[MOZIO] Successfully sent driver info for external_id: {external_id}")
                return {
                    "status": "success",
                    "message": "Driver info sent to Mozio",
                    "response": response.json()
                }
            elif response.status_code == 404:
                logger.warning(f"[MOZIO] Booking not found for external_id: {external_id}")
                return {
                    "status": "not_found",
                    "message": "Mozio booking not found - check external_id",
                    "external_id": external_id
                }
            else:
                logger.error(f"[MOZIO] Error response {response.status_code}: {response.text}")
                return {
                    "status": "error",
                    "message": f"Mozio API error: {response.status_code}",
                    "details": response.text
                }
                
    except httpx.TimeoutException:
        logger.error(f"[MOZIO] Timeout sending to Mozio for external_id: {external_id}")
        return {"status": "error", "message": "Mozio API timeout"}
    except Exception as e:
        logger.error(f"[MOZIO] Exception sending to Mozio: {str(e)}")
        return {"status": "error", "message": str(e)}


async def sync_booking_to_mozio(booking: Dict, driver: Dict, vehicle: Optional[Dict] = None) -> Dict:
    """
    Convenience function to sync a booking's driver info to Mozio
    Uses the booking's mozio_external_id field
    """
    external_id = booking.get("mozio_external_id") or booking.get("external_booking_ref")
    
    if not external_id:
        logger.debug(f"[MOZIO] Booking {booking.get('booking_ref')} has no Mozio external_id - skipping")
        return {"status": "skipped", "message": "No Mozio external_id on booking"}
    
    return await send_driver_info_to_mozio(
        external_id=external_id,
        driver=driver,
        vehicle=vehicle,
        booking=booking
    )
