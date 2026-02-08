"""
Email Service Module for Aircabio
Handles all transactional email notifications using Resend
"""

import os
import asyncio
import logging
from typing import Optional, List, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

# Initialize Email Service
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
COMPANY_NAME = "Aircabio"
COMPANY_PHONE = "+44 20 1234 5678"
COMPANY_EMAIL = "info@aircabio.com"

# Try to import resend
EMAIL_AVAILABLE = False
try:
    import resend
    # Only enable if we have a valid Resend API key (starts with re_)
    if RESEND_API_KEY and RESEND_API_KEY.startswith("re_"):
        resend.api_key = RESEND_API_KEY
        EMAIL_AVAILABLE = True
        logger.info("Resend email service initialized")
    else:
        logger.warning("Valid Resend API key not configured (key should start with 're_')")
except ImportError:
    logger.warning("Resend library not installed")

if not EMAIL_AVAILABLE:
    logger.info("Email service running in LOG-ONLY mode. Set RESEND_API_KEY with a valid key to enable actual email sending.")


def get_base_template(content: str, title: str = "Aircabio") -> str:
    """Base HTML email template with Aircabio branding"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background-color: #0A0F1C; padding: 24px; text-align: center;">
                                <h1 style="margin: 0; color: #D4AF37; font-size: 28px; font-weight: bold;">AIRCABIO</h1>
                                <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px;">Premium Airport Transfers</p>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px;">
                                {content}
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8f8f8; padding: 24px; text-align: center; border-top: 1px solid #eee;">
                                <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">{COMPANY_NAME}</p>
                                <p style="margin: 0 0 4px 0; color: #888; font-size: 12px;">{COMPANY_PHONE} | {COMPANY_EMAIL}</p>
                                <p style="margin: 8px 0 0 0; color: #aaa; font-size: 11px;">This is an automated message. Please do not reply directly to this email.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


async def send_email(to: str, subject: str, html_content: str, cc: Optional[List[str]] = None) -> Dict:
    """Send an email using Resend (non-blocking)"""
    if not EMAIL_AVAILABLE:
        # Log the email for debugging/testing
        logger.info(f"[EMAIL LOG] To: {to}, Subject: {subject}")
        return {"status": "logged", "message": "Email logged (Resend not configured - needs valid API key)"}
    
    try:
        params = {
            "from": f"{COMPANY_NAME} <{SENDER_EMAIL}>",
            "to": [to] if isinstance(to, str) else to,
            "subject": subject,
            "html": html_content
        }
        if cc:
            params["cc"] = cc
        
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: {subject}")
        return {"status": "success", "email_id": result.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")
        return {"status": "error", "message": str(e)}


# ==================== BOOKING NOTIFICATIONS ====================

async def send_booking_confirmation(booking: Dict, admin_email: Optional[str] = None):
    """Send booking confirmation to customer (and optionally admin)"""
    customer_email = booking.get("customer_email")
    if not customer_email:
        return
    
    content = f"""
    <h2 style="color: #0A0F1C; margin: 0 0 24px 0;">Booking Confirmed!</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Dear {booking.get('customer_name', 'Customer')},
    </p>
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Thank you for booking with Aircabio. Your transfer has been confirmed.
    </p>
    
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f8f8f8; border-radius: 8px; margin: 24px 0;">
        <tr>
            <td style="border-bottom: 1px solid #eee;">
                <strong style="color: #666;">Booking Reference</strong><br>
                <span style="color: #0A0F1C; font-size: 20px; font-weight: bold;">{booking.get('booking_ref', 'N/A')}</span>
            </td>
        </tr>
        <tr>
            <td style="border-bottom: 1px solid #eee;">
                <strong style="color: #666;">Date & Time</strong><br>
                <span style="color: #333;">{booking.get('pickup_date', 'N/A')} at {booking.get('pickup_time', 'N/A')}</span>
            </td>
        </tr>
        <tr>
            <td style="border-bottom: 1px solid #eee;">
                <strong style="color: #666;">Pickup Location</strong><br>
                <span style="color: #333;">{booking.get('pickup_location', 'N/A')}</span>
            </td>
        </tr>
        <tr>
            <td style="border-bottom: 1px solid #eee;">
                <strong style="color: #666;">Drop-off Location</strong><br>
                <span style="color: #333;">{booking.get('dropoff_location', 'N/A')}</span>
            </td>
        </tr>
        <tr>
            <td style="border-bottom: 1px solid #eee;">
                <strong style="color: #666;">Vehicle</strong><br>
                <span style="color: #333;">{booking.get('vehicle_name', 'Standard')}</span>
            </td>
        </tr>
        <tr>
            <td>
                <strong style="color: #666;">Total Price</strong><br>
                <span style="color: #D4AF37; font-size: 24px; font-weight: bold;">£{booking.get('customer_price', booking.get('price', 0)):.2f}</span>
            </td>
        </tr>
    </table>
    
    {f'<p style="color: #333;"><strong>Flight Number:</strong> {booking.get("flight_number")}</p>' if booking.get('flight_number') else ''}
    
    <p style="color: #666; font-size: 14px; margin-top: 24px;">
        If you have any questions, please contact us at {COMPANY_PHONE} or {COMPANY_EMAIL}.
    </p>
    """
    
    html = get_base_template(content, "Booking Confirmation")
    await send_email(customer_email, f"Booking Confirmed - {booking.get('booking_ref', 'Aircabio')}", html)
    
    if admin_email:
        admin_content = f"""
        <h2 style="color: #0A0F1C; margin: 0 0 16px 0;">New Booking Received</h2>
        <p>A new booking has been created:</p>
        <ul style="color: #333;">
            <li><strong>Ref:</strong> {booking.get('booking_ref')}</li>
            <li><strong>Customer:</strong> {booking.get('customer_name')} ({booking.get('customer_phone')})</li>
            <li><strong>Date:</strong> {booking.get('pickup_date')} at {booking.get('pickup_time')}</li>
            <li><strong>Route:</strong> {booking.get('pickup_location')} → {booking.get('dropoff_location')}</li>
            <li><strong>Price:</strong> £{booking.get('customer_price', booking.get('price', 0)):.2f}</li>
        </ul>
        """
        admin_html = get_base_template(admin_content, "New Booking Alert")
        await send_email(admin_email, f"New Booking: {booking.get('booking_ref')}", admin_html)


async def send_booking_updated(booking: Dict, changes: str = ""):
    """Send booking update notification"""
    customer_email = booking.get("customer_email")
    if not customer_email:
        return
    
    content = f"""
    <h2 style="color: #0A0F1C; margin: 0 0 24px 0;">Booking Updated</h2>
    <p style="color: #333;">Dear {booking.get('customer_name', 'Customer')},</p>
    <p style="color: #333;">Your booking <strong>{booking.get('booking_ref')}</strong> has been updated.</p>
    {f'<p style="color: #666;">{changes}</p>' if changes else ''}
    <p style="color: #333; margin-top: 16px;">
        <strong>Date:</strong> {booking.get('pickup_date')} at {booking.get('pickup_time')}<br>
        <strong>Pickup:</strong> {booking.get('pickup_location')}<br>
        <strong>Drop-off:</strong> {booking.get('dropoff_location')}
    </p>
    """
    html = get_base_template(content, "Booking Updated")
    await send_email(customer_email, f"Booking Updated - {booking.get('booking_ref')}", html)


async def send_booking_cancelled(booking: Dict, reason: str = ""):
    """Send booking cancellation notification"""
    customer_email = booking.get("customer_email")
    if not customer_email:
        return
    
    content = f"""
    <h2 style="color: #dc2626; margin: 0 0 24px 0;">Booking Cancelled</h2>
    <p style="color: #333;">Dear {booking.get('customer_name', 'Customer')},</p>
    <p style="color: #333;">Your booking <strong>{booking.get('booking_ref')}</strong> has been cancelled.</p>
    {f'<p style="color: #666;"><strong>Reason:</strong> {reason}</p>' if reason else ''}
    <p style="color: #333; margin-top: 16px;">
        If you have any questions or would like to rebook, please contact us.
    </p>
    """
    html = get_base_template(content, "Booking Cancelled")
    await send_email(customer_email, f"Booking Cancelled - {booking.get('booking_ref')}", html)


async def send_booking_completed(booking: Dict):
    """Send booking completion notification"""
    customer_email = booking.get("customer_email")
    if not customer_email:
        return
    
    content = f"""
    <h2 style="color: #16a34a; margin: 0 0 24px 0;">Trip Completed</h2>
    <p style="color: #333;">Dear {booking.get('customer_name', 'Customer')},</p>
    <p style="color: #333;">Thank you for traveling with Aircabio! Your trip has been completed.</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; margin: 24px 0;">
        <tr>
            <td>
                <strong>Booking Reference:</strong> {booking.get('booking_ref')}<br>
                <strong>Date:</strong> {booking.get('pickup_date')}<br>
                <strong>Route:</strong> {booking.get('pickup_location')} → {booking.get('dropoff_location')}
            </td>
        </tr>
    </table>
    <p style="color: #333;">We hope you had a pleasant journey. We look forward to serving you again!</p>
    """
    html = get_base_template(content, "Trip Completed")
    await send_email(customer_email, f"Trip Completed - Thank you! - {booking.get('booking_ref')}", html)


# ==================== DISPATCH NOTIFICATIONS ====================

async def send_job_alert_to_fleet(booking: Dict, fleet: Dict):
    """Send new job alert to assigned fleet"""
    fleet_email = fleet.get("email")
    if not fleet_email:
        return
    
    content = f"""
    <h2 style="color: #0A0F1C; margin: 0 0 24px 0;">New Job Assigned</h2>
    <p style="color: #333;">Dear {fleet.get('name', 'Fleet Partner')},</p>
    <p style="color: #333;">A new job has been assigned to your fleet.</p>
    
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 24px 0; border-left: 4px solid #D4AF37;">
        <tr>
            <td>
                <strong style="font-size: 18px;">Job Reference: {booking.get('booking_ref')}</strong>
            </td>
        </tr>
    </table>
    
    <table width="100%" cellpadding="8" cellspacing="0" style="margin: 16px 0;">
        <tr><td style="color: #666; width: 120px;">Date & Time:</td><td style="color: #333;"><strong>{booking.get('pickup_date')} at {booking.get('pickup_time')}</strong></td></tr>
        <tr><td style="color: #666;">Customer:</td><td style="color: #333;">{booking.get('customer_name')} ({booking.get('customer_phone', 'N/A')})</td></tr>
        <tr><td style="color: #666;">Pickup:</td><td style="color: #333;">{booking.get('pickup_location')}</td></tr>
        <tr><td style="color: #666;">Drop-off:</td><td style="color: #333;">{booking.get('dropoff_location')}</td></tr>
        <tr><td style="color: #666;">Vehicle:</td><td style="color: #333;">{booking.get('vehicle_name', 'Standard')}</td></tr>
        <tr><td style="color: #666;">Passengers:</td><td style="color: #333;">{booking.get('passengers', 1)}</td></tr>
        <tr><td style="color: #666;"><strong>Your Payout:</strong></td><td style="color: #16a34a; font-size: 20px;"><strong>£{booking.get('driver_price', 0):.2f}</strong></td></tr>
    </table>
    
    {f'<p style="color: #333;"><strong>Flight:</strong> {booking.get("flight_number")}</p>' if booking.get('flight_number') else ''}
    
    <p style="color: #666; margin-top: 24px;">Please log in to your dashboard to assign a driver and vehicle.</p>
    """
    html = get_base_template(content, "New Job Assigned")
    await send_email(fleet_email, f"New Job Assigned - {booking.get('booking_ref')}", html)


async def send_driver_assigned_to_customer(booking: Dict, driver: Dict, vehicle: Dict = None):
    """Send driver assignment notification to customer"""
    customer_email = booking.get("customer_email")
    if not customer_email:
        return
    
    vehicle_info = ""
    if vehicle:
        vehicle_info = f"""
        <tr><td style="color: #666;">Vehicle:</td><td style="color: #333;">{vehicle.get('name', '')} - {vehicle.get('plate_number', '')}</td></tr>
        <tr><td style="color: #666;">Color:</td><td style="color: #333;">{vehicle.get('color', 'N/A')}</td></tr>
        """
    
    content = f"""
    <h2 style="color: #0A0F1C; margin: 0 0 24px 0;">Driver Assigned</h2>
    <p style="color: #333;">Dear {booking.get('customer_name', 'Customer')},</p>
    <p style="color: #333;">Great news! A driver has been assigned to your booking.</p>
    
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; margin: 24px 0; border-left: 4px solid #16a34a;">
        <tr>
            <td>
                <strong style="font-size: 16px;">Your Driver Details</strong>
            </td>
        </tr>
    </table>
    
    <table width="100%" cellpadding="8" cellspacing="0" style="margin: 16px 0;">
        <tr><td style="color: #666; width: 120px;">Driver Name:</td><td style="color: #333;"><strong>{driver.get('name', 'N/A')}</strong></td></tr>
        <tr><td style="color: #666;">Phone:</td><td style="color: #333;">{driver.get('phone', 'N/A')}</td></tr>
        {vehicle_info}
    </table>
    
    <table width="100%" cellpadding="8" cellspacing="0" style="margin: 24px 0; background-color: #f8f8f8; border-radius: 8px;">
        <tr><td style="padding: 16px;">
            <strong>Booking Reference:</strong> {booking.get('booking_ref')}<br>
            <strong>Date:</strong> {booking.get('pickup_date')} at {booking.get('pickup_time')}<br>
            <strong>Pickup:</strong> {booking.get('pickup_location')}
        </td></tr>
    </table>
    """
    html = get_base_template(content, "Driver Assigned")
    await send_email(customer_email, f"Driver Assigned - {booking.get('booking_ref')}", html)


async def send_status_update(booking: Dict, status: str, message: str = ""):
    """Send job status update to customer with tracking link when en route"""
    customer_email = booking.get("customer_email")
    if not customer_email:
        return
    
    # Get frontend URL for tracking link
    frontend_url = os.environ.get("FRONTEND_URL", "https://aircabio.com")
    booking_ref = booking.get("booking_ref", "")
    tracking_url = f"{frontend_url}/track/{booking_ref}"
    
    status_messages = {
        "en_route": ("Driver En Route", "Your driver is on the way to pick you up.", "#3b82f6"),
        "arrived": ("Driver Arrived", "Your driver has arrived at the pickup location.", "#8b5cf6"),
        "in_progress": ("Trip In Progress", "Your journey is now in progress.", "#f59e0b"),
        "completed": ("Trip Completed", "Your trip has been completed. Thank you for traveling with us!", "#16a34a")
    }
    
    title, default_msg, color = status_messages.get(status, ("Status Update", "Your booking status has been updated.", "#0A0F1C"))
    
    # Build tracking button HTML (only show for en_route, arrived, in_progress)
    tracking_button = ""
    if status in ["en_route", "arrived", "in_progress"]:
        tracking_button = f"""
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
            <tr>
                <td align="center">
                    <a href="{tracking_url}" 
                       style="display: inline-block; background-color: #0A0F1C; color: #D4AF37; 
                              padding: 16px 32px; text-decoration: none; border-radius: 8px; 
                              font-weight: bold; font-size: 16px;">
                        Track Your Driver Live
                    </a>
                </td>
            </tr>
        </table>
        <p style="color: #666; text-align: center; font-size: 14px;">
            Or copy this link: <a href="{tracking_url}" style="color: #3b82f6;">{tracking_url}</a>
        </p>
        """
    
    content = f"""
    <h2 style="color: {color}; margin: 0 0 24px 0;">{title}</h2>
    <p style="color: #333;">Dear {booking.get('customer_name', 'Customer')},</p>
    <p style="color: #333; font-size: 18px;">{message or default_msg}</p>
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f8f8f8; border-radius: 8px; margin: 24px 0;">
        <tr><td>
            <strong>Booking Reference:</strong> {booking_ref}<br>
            <strong>Pickup:</strong> {booking.get('pickup_location', 'N/A')}<br>
            <strong>Drop-off:</strong> {booking.get('dropoff_location', 'N/A')}<br>
            {f"<strong>Driver:</strong> {booking.get('assigned_driver_name')}" if booking.get('assigned_driver_name') else ""}
            {f"<br><strong>Vehicle:</strong> {booking.get('assigned_vehicle_plate')}" if booking.get('assigned_vehicle_plate') else ""}
        </td></tr>
    </table>
    {tracking_button}
    """
    html = get_base_template(content, title)
    await send_email(customer_email, f"{title} - {booking_ref}", html)


# ==================== FLEET MANAGEMENT NOTIFICATIONS ====================

async def send_fleet_suspended(fleet: Dict, reason: str = ""):
    """Send fleet suspension notification"""
    fleet_email = fleet.get("email")
    if not fleet_email:
        return
    
    content = f"""
    <h2 style="color: #dc2626; margin: 0 0 24px 0;">Account Suspended</h2>
    <p style="color: #333;">Dear {fleet.get('name', 'Fleet Partner')},</p>
    <p style="color: #333;">Your fleet account has been suspended.</p>
    {f'<p style="color: #666;"><strong>Reason:</strong> {reason}</p>' if reason else ''}
    <p style="color: #333; margin-top: 16px;">
        During this suspension, you will not receive new job assignments. 
        Please contact our admin team to resolve this issue.
    </p>
    """
    html = get_base_template(content, "Account Suspended")
    await send_email(fleet_email, "Aircabio Fleet Account Suspended", html)


async def send_fleet_reactivated(fleet: Dict):
    """Send fleet reactivation notification"""
    fleet_email = fleet.get("email")
    if not fleet_email:
        return
    
    content = f"""
    <h2 style="color: #16a34a; margin: 0 0 24px 0;">Account Reactivated</h2>
    <p style="color: #333;">Dear {fleet.get('name', 'Fleet Partner')},</p>
    <p style="color: #333;">Great news! Your fleet account has been reactivated.</p>
    <p style="color: #333; margin-top: 16px;">
        You can now receive new job assignments. Please log in to your dashboard to check for available jobs.
    </p>
    """
    html = get_base_template(content, "Account Reactivated")
    await send_email(fleet_email, "Aircabio Fleet Account Reactivated", html)


async def send_fleet_password_reset(fleet: Dict, temp_password: str, dashboard_url: str = ""):
    """Send password reset notification to fleet"""
    fleet_email = fleet.get("email")
    if not fleet_email:
        return
    
    # Use provided URL or default
    login_url = dashboard_url or "https://aircabio.com/login"
    
    content = f"""
    <h2 style="color: #0A0F1C; margin: 0 0 24px 0;">Password Reset</h2>
    <p style="color: #333;">Dear {fleet.get('name', 'Fleet Partner')},</p>
    <p style="color: #333;">Your password has been reset by an administrator.</p>
    
    <table width="100%" cellpadding="16" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 24px 0; text-align: center;">
        <tr>
            <td>
                <strong style="color: #666;">Your Login Email</strong><br>
                <span style="color: #0A0F1C; font-size: 18px; font-weight: bold;">{fleet_email}</span>
            </td>
        </tr>
        <tr>
            <td style="border-top: 1px solid #e5e5e5;">
                <strong style="color: #666;">Your New Temporary Password</strong><br>
                <span style="color: #0A0F1C; font-size: 24px; font-weight: bold; font-family: monospace;">{temp_password}</span>
            </td>
        </tr>
    </table>
    
    <div style="text-align: center; margin: 32px 0;">
        <a href="{login_url}" style="display: inline-block; background-color: #0A0F1C; color: #D4AF37; text-decoration: none; padding: 14px 32px; border-radius: 4px; font-weight: bold; font-size: 16px;">
            Login to Fleet Dashboard
        </a>
    </div>
    
    <p style="color: #dc2626; font-weight: bold; text-align: center;">Please change this password after logging in.</p>
    <p style="color: #666; margin-top: 16px; font-size: 12px;">
        If you did not request this password reset, please contact us immediately at {COMPANY_EMAIL}.
    </p>
    """
    html = get_base_template(content, "Password Reset")
    await send_email(fleet_email, "Aircabio Fleet Password Reset", html)


# ==================== INVOICE NOTIFICATIONS ====================

async def send_invoice_issued(invoice: Dict):
    """Send invoice issued notification"""
    entity_email = invoice.get("entity_email")
    if not entity_email:
        return
    
    content = f"""
    <h2 style="color: #0A0F1C; margin: 0 0 24px 0;">Invoice Issued</h2>
    <p style="color: #333;">Dear {invoice.get('entity_name', 'Customer')},</p>
    <p style="color: #333;">An invoice has been issued for your account.</p>
    
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f8f8f8; border-radius: 8px; margin: 24px 0;">
        <tr>
            <td style="border-bottom: 1px solid #eee;">
                <strong>Invoice Number:</strong> {invoice.get('invoice_number')}
            </td>
        </tr>
        <tr>
            <td style="border-bottom: 1px solid #eee;">
                <strong>Due Date:</strong> {invoice.get('due_date', 'N/A')[:10] if invoice.get('due_date') else 'N/A'}
            </td>
        </tr>
        <tr>
            <td style="border-bottom: 1px solid #eee;">
                <strong>Jobs Included:</strong> {len(invoice.get('booking_ids', []))}
            </td>
        </tr>
        <tr>
            <td>
                <strong>Total Amount:</strong> <span style="color: #D4AF37; font-size: 24px;">£{invoice.get('total', 0):.2f}</span>
            </td>
        </tr>
    </table>
    
    <p style="color: #333;">Payment Terms: {invoice.get('payment_terms', 'Net 14')}</p>
    <p style="color: #666; margin-top: 16px;">
        Please log in to your dashboard to view the full invoice and download the PDF.
    </p>
    """
    html = get_base_template(content, "Invoice Issued")
    await send_email(entity_email, f"Invoice {invoice.get('invoice_number')} - Aircabio", html)


# ==================== PAYMENT NOTIFICATIONS ====================

async def send_payment_success(booking: Dict, amount: float):
    """Send payment success notification"""
    customer_email = booking.get("customer_email")
    if not customer_email:
        return
    
    content = f"""
    <h2 style="color: #16a34a; margin: 0 0 24px 0;">Payment Successful</h2>
    <p style="color: #333;">Dear {booking.get('customer_name', 'Customer')},</p>
    <p style="color: #333;">Your payment has been successfully processed.</p>
    
    <table width="100%" cellpadding="16" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; margin: 24px 0; text-align: center; border: 2px solid #16a34a;">
        <tr>
            <td>
                <span style="color: #16a34a; font-size: 14px;">PAYMENT CONFIRMED</span><br>
                <span style="color: #0A0F1C; font-size: 32px; font-weight: bold;">£{amount:.2f}</span>
            </td>
        </tr>
    </table>
    
    <p style="color: #333;">
        <strong>Booking Reference:</strong> {booking.get('booking_ref')}<br>
        <strong>Date:</strong> {booking.get('pickup_date')} at {booking.get('pickup_time')}
    </p>
    """
    html = get_base_template(content, "Payment Successful")
    await send_email(customer_email, f"Payment Confirmed - {booking.get('booking_ref')}", html)


async def send_payment_failed(booking: Dict, error: str = ""):
    """Send payment failed notification"""
    customer_email = booking.get("customer_email")
    if not customer_email:
        return
    
    content = f"""
    <h2 style="color: #dc2626; margin: 0 0 24px 0;">Payment Failed</h2>
    <p style="color: #333;">Dear {booking.get('customer_name', 'Customer')},</p>
    <p style="color: #333;">Unfortunately, your payment could not be processed.</p>
    
    {f'<p style="color: #dc2626;"><strong>Error:</strong> {error}</p>' if error else ''}
    
    <p style="color: #333; margin-top: 16px;">
        <strong>Booking Reference:</strong> {booking.get('booking_ref')}<br>
        <strong>Amount:</strong> £{booking.get('customer_price', booking.get('price', 0)):.2f}
    </p>
    
    <p style="color: #666; margin-top: 24px;">
        Please try again or use a different payment method. If the problem persists, contact us for assistance.
    </p>
    """
    html = get_base_template(content, "Payment Failed")
    await send_email(customer_email, f"Payment Failed - {booking.get('booking_ref')}", html)


# ==================== ADMIN ALERTS ====================

async def send_admin_alert(admin_email: str, subject: str, message: str, alert_type: str = "info"):
    """Send alert to admin"""
    colors = {
        "info": "#3b82f6",
        "warning": "#f59e0b",
        "error": "#dc2626",
        "success": "#16a34a"
    }
    color = colors.get(alert_type, "#3b82f6")
    
    content = f"""
    <h2 style="color: {color}; margin: 0 0 24px 0;">Admin Alert</h2>
    <table width="100%" cellpadding="16" cellspacing="0" style="background-color: #f8f8f8; border-radius: 8px; margin: 24px 0; border-left: 4px solid {color};">
        <tr>
            <td>
                <p style="color: #333; font-size: 16px; margin: 0;">{message}</p>
            </td>
        </tr>
    </table>
    <p style="color: #666; font-size: 12px;">Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    """
    html = get_base_template(content, "Admin Alert")
    await send_email(admin_email, f"[Aircabio Alert] {subject}", html)


async def send_unassigned_job_reminder(booking: Dict, admin_email: str, minutes_elapsed: int):
    """Send reminder for unassigned jobs"""
    content = f"""
    <h2 style="color: #f59e0b; margin: 0 0 24px 0;">Unassigned Job Alert</h2>
    <p style="color: #333;">A booking has been unassigned for <strong>{minutes_elapsed} minutes</strong>.</p>
    
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
        <tr><td>
            <strong>Booking:</strong> {booking.get('booking_ref')}<br>
            <strong>Customer:</strong> {booking.get('customer_name')} ({booking.get('customer_phone')})<br>
            <strong>Date:</strong> {booking.get('pickup_date')} at {booking.get('pickup_time')}<br>
            <strong>Route:</strong> {booking.get('pickup_location')} → {booking.get('dropoff_location')}
        </td></tr>
    </table>
    
    <p style="color: #333;">Please assign a fleet or driver to this booking as soon as possible.</p>
    """
    html = get_base_template(content, "Unassigned Job Alert")
    await send_email(admin_email, f"[URGENT] Unassigned Job - {booking.get('booking_ref')}", html)


# ==================== DRIVER TRACKING NOTIFICATIONS ====================

async def send_driver_tracking_link(
    driver_email: str,
    driver_name: str,
    booking_ref: str,
    pickup_location: str,
    dropoff_location: str,
    pickup_date: str,
    pickup_time: str,
    tracking_url: str,
    site_name: str = "Aircabio"
):
    """Send tracking link to driver"""
    if not driver_email:
        logger.warning("No driver email provided for tracking link")
        return
    
    content = f"""
    <h2 style="color: #0A0F1C; margin: 0 0 24px 0;">📍 Start Tracking Your Trip</h2>
    <p style="color: #333;">Hi {driver_name},</p>
    <p style="color: #333;">You have been assigned to a new job. Please click the button below to start location tracking when you begin the journey.</p>
    
    <table width="100%" cellpadding="16" cellspacing="0" style="background-color: #f8f8f8; border-radius: 8px; margin: 24px 0; border-left: 4px solid #D4AF37;">
        <tr><td>
            <strong style="color: #666;">Booking Reference</strong><br>
            <span style="color: #0A0F1C; font-size: 20px; font-weight: bold;">{booking_ref}</span>
        </td></tr>
        <tr><td style="border-top: 1px solid #e5e5e5;">
            <strong style="color: #666;">Pickup Date & Time</strong><br>
            <span style="color: #0A0F1C; font-size: 16px;">{pickup_date} at {pickup_time}</span>
        </td></tr>
        <tr><td style="border-top: 1px solid #e5e5e5;">
            <strong style="color: #666;">Route</strong><br>
            <span style="color: #0A0F1C;">📍 {pickup_location}</span><br>
            <span style="color: #666;">↓</span><br>
            <span style="color: #0A0F1C;">📍 {dropoff_location}</span>
        </td></tr>
    </table>
    
    <div style="text-align: center; margin: 32px 0;">
        <a href="{tracking_url}" style="display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 18px;">
            🚗 Start Tracking
        </a>
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
        Click the button above when you start driving to enable live location tracking.
    </p>
    
    <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 24px 0;">
        <tr><td style="text-align: center;">
            <strong style="color: #92400e;">⚠️ Important</strong><br>
            <span style="color: #92400e; font-size: 13px;">
                Your location will be shared with {site_name} dispatch team for this journey only.
                You can stop tracking at any time after completing the trip.
            </span>
        </td></tr>
    </table>
    """
    html = get_base_template(content, "Start Tracking")
    await send_email(driver_email, f"🚗 Start Tracking - Job {booking_ref}", html)
