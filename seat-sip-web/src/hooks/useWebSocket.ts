import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface WebSocketOptions {
  onOrderUpdate?: (data: any) => void;
  onPaymentUpdate?: (data: any) => void;
  onReservationUpdate?: (data: any) => void;
  onNotification?: (data: any) => void;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const token = typeof document !== 'undefined' ? document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1] : undefined;
  
  if (token && !socketRef.current) {
    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002', {
      auth: { token },
      transports: ['websocket'],
    });
  }

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    const onConnectError = (error: any) => {
      console.error('WebSocket connection error:', error);
      toast.error('Real-time updates unavailable');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Event listeners for real-time updates
    socket.on('order:created', (data) => {
      toast.success(`New order #${data.orderId} received`);
      options.onOrderUpdate?.(data);
    });

    socket.on('order:updated', (data) => {
      toast(`Order #${data.orderId} updated to ${data.status}`);
      options.onOrderUpdate?.(data);
    });

    socket.on('payment:received', (data) => {
      toast.success(`Payment of ₹${data.amount} received`);
      options.onPaymentUpdate?.(data);
    });

    socket.on('payment:failed', (data) => {
      toast.error(`Payment failed for order #${data.orderId}`);
      options.onPaymentUpdate?.(data);
    });

    socket.on('reservation:created', (data) => {
      toast.success(`New reservation for ${data.customerName}`);
      options.onReservationUpdate?.(data);
    });

    socket.on('reservation:updated', (data) => {
      toast(`Reservation status updated to ${data.status}`);
      options.onReservationUpdate?.(data);
    });

    socket.on('notification', (data) => {
      toast(data.message);
      options.onNotification?.(data);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('payment:received');
      socket.off('payment:failed');
      socket.off('reservation:created');
      socket.off('reservation:updated');
      socket.off('notification');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const joinRoom = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-room', room);
    }
  }, []);

  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-room', room);
    }
  }, []);

  return {
    isConnected,
    socket: socketRef.current,
    emit,
    joinRoom,
    leaveRoom,
  };
}
