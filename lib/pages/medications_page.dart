import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;

class Medication {
  final int id;
  String name;
  String dosage;
  int frequency; // vezes ao dia
  int duration; // dias

  Medication({
    required this.id,
    required this.name,
    required this.dosage,
    required this.frequency,
    required this.duration,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'dosage': dosage,
      'frequency': frequency,
      'duration': duration,
    };
  }

  // Adicione a partir de Map para persistência
  factory Medication.fromMap(Map<String, dynamic> map) {
    return Medication(
      id: map['id'],
      name: map['name'],
      dosage: map['dosage'],
      frequency: map['frequency'],
      duration: map['duration'],
    );
  }
}

class MedicationsPage extends StatefulWidget {
  @override
  _MedicationsPageState createState() => _MedicationsPageState();
}

class _MedicationsPageState extends State<MedicationsPage> {
  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  List<Medication> _medications = [];

  @override
  void initState() {
    super.initState();
    tzdata.initializeTimeZones();
    _initializeNotifications();
    _loadMedications();
  }

  Future<void> _initializeNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    final initSettings = InitializationSettings(
      android: androidSettings,
      // iOS/macOS removed since não usamos no momento
    );

    await _notifications.initialize(initSettings);
  }

  Future<void> _loadMedications() async {
    // Aqui você carrega a lista da persistência, ex: SharedPreferences, DB, etc
    // Por enquanto, lista vazia para teste
    setState(() {
      _medications = [];
    });
  }

  Future<void> _scheduleNotification(
      Medication med, DateTime scheduledDate, int notificationId) async {
    await _notifications.zonedSchedule(
      notificationId,
      'Hora do medicamento',
      '${med.name} - ${med.dosage}',
      tz.TZDateTime.from(scheduledDate, tz.local),
      NotificationDetails(
        android: AndroidNotificationDetails(
          'medications_channel',
          'Medicações',
          channelDescription: 'Lembretes para tomar medicamentos',
          importance: Importance.max,
          priority: Priority.high,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      androidAllowWhileIdle: true,
      uiLocalNotificationDateInterpretation: null, // Removido para evitar erro
      // Parâmetro inválido removido
    );
  }

  // Resto do código para exibir lista, editar, excluir, marcar como tomado etc
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Medicações'),
      ),
      body: _medications.isEmpty
          ? Center(child: Text('Aqui vai a lista de medicamentos'))
          : ListView.builder(
              itemCount: _medications.length,
              itemBuilder: (context, index) {
                final med = _medications[index];
                return ListTile(
                  title: Text('${med.name}'),
                  subtitle: Text('${med.dosage} - ${med.frequency} vezes/dia'),
                  trailing: IconButton(
                    icon: Icon(Icons.edit),
                    onPressed: () {
                      // Abre tela de edição
                    },
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Abrir formulário para adicionar medicação
        },
        child: Icon(Icons.add),
      ),
    );
  }
}
