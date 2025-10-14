"""
预约管理API视图
"""

from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from django.db.models import Q

from .models import Appointment, UnavailableSlot, CustomUser
from .serializers import AppointmentSerializer, UnavailableSlotSerializer
from .services.notification_service import notification_service

def get_malaysia_date():
    """获取马来西亚当前日期"""
    malaysia_tz = pytz.timezone('Asia/Kuala_Lumpur')
    malaysia_now = datetime.now(malaysia_tz)
    return malaysia_now.date()



@api_view(['POST'])
@parser_classes([JSONParser])
def create_appointment(request):
    """创建预约 - 支持新患者占位模式"""
    
    try:
        data = request.data
        
        # 验证必填字段
        therapist_id = data.get('therapist_id')
        start_at_str = data.get('start_at')
        duration_min = data.get('duration_min', 30)
        
        
        if not therapist_id or not start_at_str:
            return Response({
                'error': 'Missing required fields: therapist_id, start_at'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 验证时长
        if duration_min not in [30, 45, 60]:
            return Response({
                'error': 'Invalid duration. Must be 30, 45, or 60 minutes.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 解析时间
        try:
            # 处理带毫秒的ISO格式
            if start_at_str.endswith('Z'):
                start_at_str = start_at_str.replace('Z', '+00:00')
            elif '.' in start_at_str and not start_at_str.endswith('+00:00'):
                # 如果有毫秒但没有时区信息，添加UTC时区
                if not start_at_str.endswith('Z') and '+' not in start_at_str and '-' not in start_at_str[-6:]:
                    start_at_str += '+00:00'
            
            start_at = datetime.fromisoformat(start_at_str)
            
            # 检查是否已经是aware datetime
            if start_at.tzinfo is None:
                # 如果是naive datetime，需要make_aware
                start_at = timezone.make_aware(start_at)
            else:
                # 如果已经是aware datetime，直接使用
                pass
            
        except ValueError as e:
            return Response({
                'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SSZ)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 计算结束时间
        end_at = start_at + timedelta(minutes=duration_min)
        
        # 验证治疗师存在
        therapist = get_object_or_404(CustomUser, id=therapist_id, role='therapist')
        
        # 验证患者（如果提供）
        patient_id = data.get('patient_id')
        patient = None
        if patient_id:
            patient = get_object_or_404(CustomUser, id=patient_id, role='patient')
        
        # 新患者占位字段
        contact_name = data.get('contact_name', '')
        contact_phone = data.get('contact_phone', '')
        
        
        # 验证：要么有患者ID，要么有联系方式
        if not patient_id and not (contact_name and contact_phone):
            return Response({
                'error': 'Either patient_id or contact_name + contact_phone must be provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # 冲突检测
            if _has_time_conflict(therapist_id, start_at, end_at):
                return Response({
                    'error': 'Time slot unavailable. This time conflicts with another appointment.'
                }, status=status.HTTP_409_CONFLICT)
            
            
            # 根据创建者确定状态
            # 如果患者创建，状态为 Pending；如果治疗师创建，状态为 Scheduled
            # 优先检查therapist_created字段，如果没有则根据patient_id判断
            if data.get('therapist_created'):
                appointment_status = 'Scheduled'  # 治疗师创建的预约默认为Scheduled
            elif data.get('patient_id'):
                appointment_status = 'Pending'  # 患者创建的预约默认为Pending
            else:
                appointment_status = 'Scheduled'  # 默认治疗师创建
            
            # 创建预约
            appointment = Appointment.objects.create(
                therapist_id=therapist,
                patient_id=patient,
                contact_name=contact_name,
                contact_phone=contact_phone,
                start_at=start_at,
                end_at=end_at,
                duration_min=duration_min,
                mode=data.get('mode', 'onsite'),
                notes=data.get('notes', ''),
                patient_message=data.get('patient_message', ''),
                status=appointment_status
            )
            
            # 发送通知
            notification_service.send_appointment_created(appointment)
            
            serializer = AppointmentSerializer(appointment)
            return Response({
                'message': 'Appointment created successfully!',
                'appointment': serializer.data
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response({
            'error': f'An error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@parser_classes([JSONParser])
def update_appointment_status(request, appointment_id):
    """更新预约状态"""
    try:
        appointment = get_object_or_404(Appointment, appointment_code=appointment_id)
        action = request.data.get('action')
        
        if not action:
            return Response({
                'error': 'Action is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = appointment.status
        
        with transaction.atomic():
            if action == 'complete':
                if appointment.status != 'Scheduled':
                    return Response({
                        'error': 'Only scheduled appointments can be completed'
                    }, status=status.HTTP_400_BAD_REQUEST)
                appointment.status = 'Completed'
                
            elif action == 'cancel':
                if appointment.status != 'Scheduled':
                    return Response({
                        'error': 'Only scheduled appointments can be cancelled'
                    }, status=status.HTTP_400_BAD_REQUEST)
                appointment.status = 'Cancelled'
                
            elif action == 'bind_patient':
                patient_id = request.data.get('patient_id')
                if not patient_id:
                    return Response({
                        'error': 'patient_id is required for bind_patient action'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                patient = get_object_or_404(CustomUser, id=patient_id, role='patient')
                appointment.patient_id = patient
                appointment.contact_name = None
                appointment.contact_phone = None
                
            else:
                return Response({
                    'error': 'Invalid action. Must be complete, cancel, or bind_patient'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            appointment.save()
            
            # 发送状态变更通知
            if action in ['complete', 'cancel']:
                notification_service.send_appointment_status_changed(
                    appointment, old_status, appointment.status
                )
            
            serializer = AppointmentSerializer(appointment)
            return Response({
                'message': f'Appointment {action} successfully',
                'appointment': serializer.data
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        return Response({
            'error': f'An error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def list_appointments(request):
    """获取预约列表"""
    try:
        scope = request.GET.get('scope')
        user_id = request.GET.get('user_id')
        from_date = request.GET.get('from')
        to_date = request.GET.get('to')
        status_filter = request.GET.get('status')
        
        
        if not scope or not user_id:
            return Response({
                'error': 'scope and user_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 构建查询
        if scope == 'therapist':
            appointments = Appointment.objects.filter(therapist_id__id=user_id)
        elif scope == 'patient':
            appointments = Appointment.objects.filter(patient_id__id=user_id)
        else:
            return Response({
                'error': 'Invalid scope. Must be therapist or patient'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 日期过滤 - 使用日期范围而不是精确时间
        if from_date:
            try:
                # 解析日期字符串（YYYY-MM-DD格式）
                from_dt = datetime.strptime(from_date, '%Y-%m-%d')
                from_dt = timezone.make_aware(from_dt)
                appointments = appointments.filter(start_at__date__gte=from_dt.date())
            except ValueError:
                return Response({
                    'error': 'Invalid from_date format'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        if to_date:
            try:
                # 解析日期字符串（YYYY-MM-DD格式）
                to_dt = datetime.strptime(to_date, '%Y-%m-%d')
                to_dt = timezone.make_aware(to_dt)
                appointments = appointments.filter(start_at__date__lte=to_dt.date())
            except ValueError:
                return Response({
                    'error': 'Invalid to_date format'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # 状态过滤
        if status_filter:
            appointments = appointments.filter(status=status_filter)
        
        appointments = appointments.order_by('start_at')
        serializer = AppointmentSerializer(appointments, many=True)
        
        return Response({
            'appointments': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'An error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_availability_slots(request):
    """获取不可用时间段"""
    try:
        therapist_id = request.GET.get('therapist_id')
        date = request.GET.get('date')
        
        if not therapist_id:
            return Response({
                'error': 'therapist_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        slots = UnavailableSlot.objects.filter(therapist_id=therapist_id)
        
        if date:
            try:
                date_obj = datetime.fromisoformat(date).date()
                slots = slots.filter(start_at__date=date_obj)
            except ValueError:
                return Response({
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        slots = slots.order_by('start_at')
        serializer = UnavailableSlotSerializer(slots, many=True)
        
        return Response({
            'slots': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'An error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@parser_classes([JSONParser])
def create_availability_slot(request):
    """创建不可用时间段"""
    try:
        data = request.data
        
        # 验证必填字段
        therapist_id = data.get('therapist_id')
        start_at_str = data.get('start_at')
        end_at_str = data.get('end_at')
        
        if not all([therapist_id, start_at_str, end_at_str]):
            return Response({
                'error': 'Missing required fields: therapist_id, start_at, end_at'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 解析时间
        try:
            # 处理 Z 后缀
            if start_at_str.endswith('Z'):
                start_at_str = start_at_str.replace('Z', '+00:00')
            if end_at_str.endswith('Z'):
                end_at_str = end_at_str.replace('Z', '+00:00')
            
            start_at = datetime.fromisoformat(start_at_str)
            if start_at.tzinfo is None:
                start_at = timezone.make_aware(start_at)
            
            end_at = datetime.fromisoformat(end_at_str)
            if end_at.tzinfo is None:
                end_at = timezone.make_aware(end_at)
                
        except ValueError as e:
            return Response({
                'error': f'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SSZ). Error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 验证治疗师存在
        therapist = get_object_or_404(CustomUser, id=therapist_id, role='therapist')
        
        # 创建不可用时间段
        slot = UnavailableSlot.objects.create(
            therapist_id=therapist,
            start_at=start_at,
            end_at=end_at,
            description=data.get('description', '')
        )
        
        serializer = UnavailableSlotSerializer(slot)
        return Response({
            'message': 'Unavailable slot created successfully!',
            'slot': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'An error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _has_time_conflict(therapist_id, start_at, end_at):
    """检查时间冲突"""
    # 查找与新区间重叠的活跃预约
    overlapping = Appointment.objects.filter(
        therapist_id=therapist_id,
        status__in=['Scheduled', 'Completed'],  # 只检查活跃状态
        start_at__lt=end_at,
        end_at__gt=start_at
    ).exists()
    
    return overlapping


@api_view(['DELETE'])
def delete_availability_slot(request, slot_id):
    """删除不可用时间段"""
    try:
        slot = get_object_or_404(UnavailableSlot, id=slot_id)
        slot.delete()
        
        return Response({
            'message': 'Unavailable slot deleted successfully!'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'An error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
def respond_to_appointment(request, appointment_id):
    """治疗师响应预约请求（接受/拒绝）"""
    try:
        data = request.data
        action = data.get('action')  # 'accept' or 'reject'
        
        if action not in ['accept', 'reject']:
            return Response({
                'error': 'Invalid action. Must be "accept" or "reject"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 支持通过 ID 或 appointment_code 查找预约
        try:
            # 首先尝试作为数字 ID
            appointment_id_int = int(appointment_id)
            appointment = get_object_or_404(Appointment, id=appointment_id_int)
        except ValueError:
            # 如果不是数字，则作为 appointment_code 查找
            appointment = get_object_or_404(Appointment, appointment_code=appointment_id)
        
        # 检查预约状态是否为 Pending
        if appointment.status != 'Pending':
            return Response({
                'error': 'Appointment is not in pending status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 更新状态
        if action == 'accept':
            appointment.status = 'Scheduled'
            message = 'Appointment accepted successfully'
        else:  # reject
            appointment.status = 'Cancelled'
            appointment.cancelled_at = timezone.now()
            message = 'Appointment rejected successfully'
        
        appointment.save()
        
        # 发送通知给患者
        if appointment.patient_id:
            notification_service.send_notification(
                user=appointment.patient_id,
                title=f'Appointment {action.title()}d',
                message=f'Your appointment request has been {action}ed by the therapist.',
                notification_type='appointment_respond'
            )
        
        return Response({
            'message': message,
            'appointment': {
                'id': appointment.id,
                'status': appointment.status,
                'patient_name': appointment.patient_id.username if appointment.patient_id else appointment.contact_name,
                'start_at': appointment.start_at,
                'end_at': appointment.end_at
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'An error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@parser_classes([JSONParser])
@csrf_exempt
def complete_appointment(request, appointment_id):
    """完成预约 - 需要输入session_notes"""
    try:
        appointment = get_object_or_404(Appointment, appointment_code=appointment_id)
        
        # 从请求中获取用户ID
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({
                'error': 'User ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 获取用户对象
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 检查权限 - 只有治疗师可以完成预约
        if user.role != 'therapist' or appointment.therapist_id.id != user.id:
            return Response({
                'error': 'You do not have permission to complete this appointment'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 检查状态
        if appointment.status not in ['Scheduled', 'Pending']:
            return Response({
                'error': 'Appointment cannot be completed in current status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 获取session_notes
        session_notes = request.data.get('session_notes', '').strip()
        if not session_notes:
            return Response({
                'error': 'Session notes are required to complete appointment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 更新预约
        appointment.status = 'Completed'
        appointment.session_notes = session_notes
        appointment.completed_at = timezone.now()
        appointment.save()
        
        # 发送通知给患者
        if appointment.patient_id:
            notification_service.send_notification(
                user=appointment.patient_id,
                title='Appointment Completed',
                message='Your appointment has been completed by the therapist.',
                notification_type='appointment_complete'
            )
        
        return Response({
            'message': 'Appointment completed successfully',
            'appointment': {
                'id': appointment.id,
                'status': appointment.status,
                'session_notes': appointment.session_notes,
                'completed_at': appointment.completed_at,
                'patient_name': appointment.patient_id.username if appointment.patient_id else appointment.contact_name,
                'start_at': appointment.start_at,
                'end_at': appointment.end_at
            }
        })
        
    except Exception as e:
        return Response({
            'error': f'Failed to complete appointment: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@parser_classes([JSONParser])
@csrf_exempt
def cancel_appointment(request, appointment_id):
    """取消预约 - 需要输入cancel_reason"""
    try:
        appointment = get_object_or_404(Appointment, appointment_code=appointment_id)
        
        # 从请求中获取用户ID
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({
                'error': 'User ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 获取用户对象
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 检查权限 - 治疗师或患者可以取消预约
        if (user.role == 'therapist' and appointment.therapist_id.id != user.id) or \
           (user.role == 'patient' and appointment.patient_id and appointment.patient_id.id != user.id):
            return Response({
                'error': 'You do not have permission to cancel this appointment'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 检查状态
        if appointment.status in ['Completed', 'Cancelled']:
            return Response({
                'error': 'Appointment cannot be cancelled in current status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 获取cancel_reason
        cancel_reason = request.data.get('cancel_reason', '').strip()
        if not cancel_reason:
            return Response({
                'error': 'Cancel reason is required to cancel appointment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 更新预约
        appointment.status = 'Cancelled'
        appointment.cancel_reason = cancel_reason
        appointment.cancelled_at = timezone.now()
        appointment.save()
        
        # 发送通知
        if appointment.patient_id and user.role == 'therapist':
            # 治疗师取消 - 通知患者
            notification_service.send_notification(
                user=appointment.patient_id,
                title='Appointment Cancelled',
                message=f'Your appointment has been cancelled by the therapist. Reason: {cancel_reason}',
                notification_type='appointment_cancel'
            )
        elif appointment.therapist_id and user.role == 'patient':
            # 患者取消 - 通知治疗师
            notification_service.send_notification(
                user=appointment.therapist_id,
                title='Appointment Cancelled',
                message=f'Your appointment has been cancelled by the patient. Reason: {cancel_reason}',
                notification_type='appointment_cancel'
            )
        
        return Response({
            'message': 'Appointment cancelled successfully',
            'appointment': {
                'id': appointment.id,
                'status': appointment.status,
                'cancel_reason': appointment.cancel_reason,
                'cancelled_at': appointment.cancelled_at,
                'patient_name': appointment.patient_id.username if appointment.patient_id else appointment.contact_name,
                'start_at': appointment.start_at,
                'end_at': appointment.end_at
            }
        })
        
    except Exception as e:
        return Response({
            'error': f'Failed to cancel appointment: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
