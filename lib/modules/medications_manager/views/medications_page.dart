import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../../../models/medication.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tzdata;

class MedicationsPage extends StatefulWidget {
  @override
  State<MedicationsPage> createState() => _MedicationsPageState();
}

class _MedicationsPageState extends State<MedicationsPage> {
  final List<Medication> _medications = [];
  final _notifications = FlutterLocalNotificationsPlugin();

  @override
  void initState() {
    super.initState();
    _loadMedications();
    _initializeNotifications();
  }

  Future<void> _initializeNotifications() async {
    tzdata.initializeTimeZones();
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const settings = InitializationSettings(android: android);
    await _notifications.initialize(settings);
  }

  Future<void> _showNotification(Medication med) async {
    final now = DateTime.now();
    final parts = med.time.split(':');
    final hour = int.parse(parts[0]);
    final minute = int.parse(parts[1]);

    final scheduleTime = DateTime(now.year, now.month, now.day, hour, minute);
    final tzSchedule = tz.TZDateTime.from(
      scheduleTime.isAfter(now) ? scheduleTime : now.add(Duration(seconds: 5)),
      tz.local,
    );

    await _notifications.zonedSchedule(
      med.id.hashCode,
      'Hora do medicamento',
      '${med.name} - ${med.dosage}',
      tzSchedule,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'med_channel',
          'Medicamentos',
          importance: Importance.max,
          priority: Priority.high,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      matchDateTimeComponents: null,
    );
  }

  Future<void> _loadMedications() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getStringList('medications') ?? [];
    setState(() {
      _medications.addAll(data.map((e) => Medication.fromJson(json.decode(e))));
    });
  }

  Future<void> _saveMedications() async {
    final prefs = await SharedPreferences.getInstance();
    final data = _medications.map((e) => json.encode(e.toJson())).toList();
    await prefs.setStringList('medications', data);
  }

  void _addOrEditMedication([Medication? existing]) async {
    final nameController = TextEditingController(text: existing?.name ?? '');
    final dosageController =
        TextEditingController(text: existing?.dosage ?? '');
    TimeOfDay selectedTime =
        existing != null ? _parseTime(existing.time) : TimeOfDay.now();

    await showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title:
            Text(existing == null ? 'Novo medicamento' : 'Editar medicamento'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: nameController,
                decoration: InputDecoration(labelText: 'Nome')),
            TextField(
                controller: dosageController,
                decoration: InputDecoration(labelText: 'Dosagem')),
            TextButton(
              child:
                  Text('Selecionar horário: ${selectedTime.format(context)}'),
              onPressed: () async {
                final picked = await showTimePicker(
                    context: context, initialTime: selectedTime);
                if (picked != null) selectedTime = picked;
              },
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context), child: Text('Cancelar')),
          ElevatedButton(
            onPressed: () {
              final med = Medication(
                id: existing?.id ?? const Uuid().v4(),
                name: nameController.text,
                dosage: dosageController.text,
                time:
                    '${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}',
              );
              setState(() {
                if (existing != null) {
                  final index =
                      _medications.indexWhere((m) => m.id == existing.id);
                  _medications[index] = med;
                } else {
                  _medications.add(med);
                }
              });
              _saveMedications();
              _showNotification(med);
              Navigator.pop(context);
            },
            child: Text('Salvar'),
          ),
        ],
      ),
    );
  }

  TimeOfDay _parseTime(String timeStr) {
    final parts = timeStr.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Meus Medicamentos')),
      body: ListView.builder(
        itemCount: _medications.length,
        itemBuilder: (_, index) {
          final med = _medications[index];
          return Dismissible(
            key: Key(med.id),
            direction: DismissDirection.endToStart,
            background: Container(
              color: Colors.red,
              alignment: Alignment.centerRight,
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Icon(Icons.delete, color: Colors.white),
            ),
            onDismissed: (_) {
              setState(() => _medications.removeAt(index));
              _saveMedications();
            },
            child: ListTile(
              title: Text('${med.name} - ${med.dosage}'),
              subtitle: Text('Horário: ${med.time}'),
              onTap: () => _addOrEditMedication(med),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _addOrEditMedication(),
        child: Icon(Icons.add),
      ),
    );
  }
}
