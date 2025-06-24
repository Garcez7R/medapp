import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

const String channelId = 'medication_channel';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const AndroidInitializationSettings initializationSettingsAndroid =
      AndroidInitializationSettings('@mipmap/ic_launcher');

  const InitializationSettings initializationSettings =
      InitializationSettings(android: initializationSettingsAndroid);

  await flutterLocalNotificationsPlugin.initialize(initializationSettings);

  // Criação do canal SEM som customizado (usar som padrão)
  final AndroidNotificationChannel channel = AndroidNotificationChannel(
    channelId,
    'Medicações',
    description: 'Notificações de medicamentos',
    importance: Importance.max,
    playSound: true,
    enableVibration: true,
    vibrationPattern: Int64List.fromList([0, 1000, 500, 1000]),
  );

  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  runApp(const MaterialApp(home: TestNotificationPage()));
}

class TestNotificationPage extends StatelessWidget {
  const TestNotificationPage({super.key});

  Future<void> _showTestNotification() async {
    try {
      print('Tentando disparar notificação...');
      final AndroidNotificationDetails androidDetails =
          AndroidNotificationDetails(
        channelId,
        'Medicações',
        channelDescription: 'Notificações de medicamentos',
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        vibrationPattern: Int64List.fromList([0, 1000, 500, 1000]),
        visibility: NotificationVisibility.public,
      );

      final NotificationDetails platformDetails =
          NotificationDetails(android: androidDetails);

      await flutterLocalNotificationsPlugin.show(
        0,
        'Teste de Notificação',
        'Notificação com vibração e som padrão ativados!',
        platformDetails,
      );

      print('Notificação disparada com sucesso.');
    } catch (e) {
      print('Erro ao disparar notificação: \$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Teste de Notificação')),
      body: Center(
        child: ElevatedButton(
          onPressed: _showTestNotification,
          child: const Text('Disparar Notificação'),
        ),
      ),
    );
  }
}
