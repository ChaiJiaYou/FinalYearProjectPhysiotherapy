"""
通知服务 - 支持预约创建和状态变更通知
"""
import logging
from typing import Optional, Dict, Any
from django.utils import timezone
from datetime import timedelta
from ..models import Appointment, Notification

logger = logging.getLogger(__name__)


class NotificationService:
    """通知服务基类"""
    
    def __init__(self):
        self.adapters = []
    
    def add_adapter(self, adapter):
        """添加通知适配器"""
        self.adapters.append(adapter)
    
    def send_notification(self, user, title: str, message: str, notification_type: str = 'appointment', related_id: Optional[str] = None):
        """发送通知"""
        # 创建数据库通知记录
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            related_id=related_id
        )
        
        # 通过所有适配器发送
        for adapter in self.adapters:
            try:
                adapter.send(user, title, message, notification_type, related_id)
            except Exception as e:
                logger.error(f"Failed to send notification via {adapter.__class__.__name__}: {e}")
        
        return notification
    
    def send_appointment_created(self, appointment: Appointment):
        """发送预约创建通知"""
        # 通知患者（如果有）
        if appointment.patient_id:
            self.send_notification(
                user=appointment.patient_id,
                title="New Appointment Scheduled",
                message=f"Your appointment with {appointment.therapist_id.username} has been scheduled for {appointment.start_at.strftime('%d/%b/%Y at %I:%M %p')}",
                related_id=appointment.appointment_code
            )
        
        # 通知治疗师
        self.send_notification(
            user=appointment.therapist_id,
            title="New Appointment Created",
            message=f"New appointment with {appointment.contact_name or appointment.patient_id.username if appointment.patient_id else 'New Patient'} scheduled for {appointment.start_at.strftime('%d/%b/%Y at %I:%M %p')}",
            related_id=appointment.appointment_code
        )
    
    def send_appointment_status_changed(self, appointment: Appointment, old_status: str, new_status: str):
        """发送预约状态变更通知"""
        status_messages = {
            'Completed': 'Your appointment has been marked as completed',
            'Cancelled': 'Your appointment has been cancelled'
        }
        
        if new_status in status_messages:
            # 通知患者（如果有）
            if appointment.patient_id:
                self.send_notification(
                    user=appointment.patient_id,
                    title=f"Appointment {new_status}",
                    message=f"{status_messages[new_status]} for {appointment.start_at.strftime('%d/%b/%Y at %I:%M %p')}",
                    related_id=appointment.appointment_code
                )
            
            # 通知治疗师
            self.send_notification(
                user=appointment.therapist_id,
                title=f"Appointment {new_status}",
                message=f"Appointment with {appointment.contact_name or appointment.patient_id.username if appointment.patient_id else 'Patient'} has been {new_status.lower()}",
                related_id=appointment.appointment_code
            )
    
    def send_appointment_reminder(self, appointment: Appointment, hours_before: int = 24):
        """发送预约提醒"""
        if appointment.patient_id:
            self.send_notification(
                user=appointment.patient_id,
                title="Appointment Reminder",
                message=f"Reminder: You have an appointment with {appointment.therapist_id.username} in {hours_before} hours ({appointment.start_at.strftime('%d/%b/%Y at %I:%M %p')})",
                related_id=appointment.appointment_code
            )


class ConsoleNotificationAdapter:
    """控制台通知适配器（用于开发测试）"""
    
    def send(self, user, title: str, message: str, notification_type: str, related_id: Optional[str] = None):
        print(f"[{notification_type.upper()}] {title}")
        print(f"To: {user.username} ({user.email})")
        print(f"Message: {message}")
        if related_id:
            print(f"Related ID: {related_id}")
        print("-" * 50)


class LogNotificationAdapter:
    """日志通知适配器"""
    
    def send(self, user, title: str, message: str, notification_type: str, related_id: Optional[str] = None):
        logger.info(f"Notification sent to {user.username}: {title} - {message}")


# 全局通知服务实例
notification_service = NotificationService()
notification_service.add_adapter(ConsoleNotificationAdapter())
notification_service.add_adapter(LogNotificationAdapter())
