import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/timezone.dart' as tz;
import '../models/medication.dart';

class MedicationsPage extends StatefulWidget {
  @override
  _MedicationsPageState createState() => _MedicationsPageState();
}

class _MedicationsPageState extends State<MedicationsPage> {
  List<Medication> _medications = [];
  final _notifications = FlutterLocalNotificationsPlugin();
  final taken = <String>{};

  @override
  void initState() {
    super.initState();
    _initNotifications();
    _loadMedications();
  }

  Future<void> _initNotifications() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const linux = LinuxInitializationSettings(defaultActionName: 'Abrir');
    const settings = InitializationSettings(android: android, linux: linux);
    await _notifications.initialize(settings);
  }

  Future<void> _loadMedications() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('medications');
    if (data != null) {
      final List list = jsonDecode(data);
      setState(() {
        _medications = list.map((e) => Medication.fromJson(e)).toList();
      });
    }
  }

  Future<void> _saveMedications() async {
    final prefs = await SharedPreferences.getInstance();
    final data = jsonEncode(_medications.map((e) => e.toJson()).toList());
    await prefs.setString('medications', data);
  }

  Future<void> _scheduleAllNotifications(Medication med) async {
    if (med.time == null) return;

    final now = DateTime.now();
    final firstDose = DateTime(now.year, now.month, now.day, med.time!.hour, med.time!.minute);
    final intervalHours = (24 / med.frequency).floor();
    final totalDoses = med.duration * med.frequency;

    for (int i = 0; i < totalDoses; i++) {
      final scheduledTime = firstDose.add(Duration(hours: intervalHours * i));
      final tzTime = tz.TZDateTime.from(scheduledTime, tz.local);

      final notificationId = med.id.hashCode + i;

      final androidDetails = AndroidNotificationDetails(
        'med_channel',
        'Medicamentos',
        channelDescription: 'Lembretes de medicação',
        importance: Importance.max,
      );

      final linuxDetails = LinuxNotificationDetails();

      final platformDetails = NotificationDetails(
        android: androidDetails,
        linux: linuxDetails,
      );

      if (Platform.isAndroid) {
      } else {
      }
    }
  }

  void _addOrEditMedication([Medication? med]) async {
    final controllerName = TextEditingController(text: med?.name);
    final controllerDosage = TextEditingController(text: med?.dosage);
    final controllerFreq = TextEditingController(text: med?.frequency.toString());
    final controllerDuration = TextEditingController(text: med?.duration.toString());
    TimeOfDay? selectedTime = med?.time;

    await showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(med == null ? 'Novo medicamento' : 'Editar medicamento'),
        content: SingleChildScrollView(
          child: Column(
            children: [
              TextField(controller: controllerName, decoration: InputDecoration(labelText: 'Nome')),
              TextField(controller: controllerDosage, decoration: InputDecoration(labelText: 'Dosagem')),
              TextField(controller: controllerFreq, decoration: InputDecoration(labelText: 'Doses por dia')),
              TextField(controller: controllerDuration, decoration: InputDecoration(labelText: 'Duração (dias)')),
              SizedBox(height: 12),
              Row(
                children: [
                  Text(selectedTime == null
                      ? 'Horário: Não definido'
                      : 'Horário: ${selectedTime?.format(context)}'),
                  Spacer(),
                  TextButton(
                    onPressed: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: selectedTime ?? TimeOfDay.now(),
                      );
                      if (picked != null) {
                        setState(() => selectedTime = picked);
                      }
                    },
                    child: Text('Selecionar horário'),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('Cancelar')),
          ElevatedButton(
            onPressed: () {
              final newMed = Medication(
                id: med?.id ?? DateTime.now().toIso8601String(),
                name: controllerName.text,
                dosage: controllerDosage.text,
                frequency: int.tryParse(controllerFreq.text) ?? 1,
                duration: int.tryParse(controllerDuration.text) ?? 1,
                time: selectedTime,
              );
              setState(() {
                if (med != null) _medications.removeWhere((m) => m.id == med.id);
                _medications.add(newMed);
              });
              _saveMedications();
              _scheduleAllNotifications(newMed);
              Navigator.pop(context);
            },
            child: Text('Salvar'),
          ),
        ],
      ),
    );
  }

  void _deleteMedication(String id) async {
    setState(() => _medications.removeWhere((m) => m.id == id));
    _saveMedications();
  }

  void _toggleTaken(String id) {
    setState(() {
      if (taken.contains(id)) {
        taken.remove(id);
      } else {
        taken.add(id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Medicamentos')),
      body: ListView(
        children: _medications.map((med) {
          final isTaken = taken.contains(med.id);
          return Dismissible(
            key: Key(med.id),
            direction: DismissDirection.endToStart,
            background: Container(
              color: Colors.red,
              alignment: Alignment.centerRight,
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Icon(Icons.delete, color: Colors.white),
            ),
            onDismissed: (_) => _deleteMedication(med.id),
            child: ListTile(
              title: Text(med.name),
              subtitle: Text(
                  'Dose: ${med.dosage} • Horário: ${med.time?.format(context) ?? "não definido"}'),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: Icon(Icons.edit),
                    onPressed: () => _addOrEditMedication(med),
                  ),
                  IconButton(
                    icon: Icon(
                      isTaken ? Icons.check_circle : Icons.radio_button_unchecked,
                      color: isTaken ? Colors.green : null,
                    ),
                    onPressed: () => _toggleTaken(med.id),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _addOrEditMedication(),
        child: Icon(Icons.add),
      ),
    );
  }
}
