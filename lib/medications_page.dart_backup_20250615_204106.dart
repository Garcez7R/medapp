import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

// Importações para timezone
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class Medication {
  String id;
  String name;
  String dosage;
  int frequency; // vezes ao dia
  List<String> times; // horários em HH:mm
  String? notes;

  Medication({
    required this.id,
    required this.name,
    required this.dosage,
    required this.frequency,
    required this.times,
    this.notes,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'dosage': dosage,
      'frequency': frequency,
      'times': times,
      'notes': notes,
    };
  }

  factory Medication.fromMap(Map<String, dynamic> map) {
    return Medication(
      id: map['id'],
      name: map['name'],
      dosage: map['dosage'],
      frequency: map['frequency'],
      times: List<String>.from(map['times']),
      notes: map['notes'],
    );
  }
}

class MedicationsPage extends StatefulWidget {
  @override
  _MedicationsPageState createState() => _MedicationsPageState();
}

class _MedicationsPageState extends State<MedicationsPage> {
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  List<Medication> medications = [];

  @override
  void initState() {
    super.initState();
    _initNotifications();
    _loadMedications();
  }

  Future<void> _initNotifications() async {
    // Inicializa timezone
    tz.initializeTimeZones();

    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    final InitializationSettings initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid);

    await flutterLocalNotificationsPlugin.initialize(initializationSettings);
  }

  Future<void> _loadMedications() async {
    final prefs = await SharedPreferences.getInstance();
    final medsJson = prefs.getString('medications');
    if (medsJson != null) {
      List<dynamic> decoded = jsonDecode(medsJson);
      setState(() {
        medications = decoded.map((m) => Medication.fromMap(m)).toList();
      });
    }
  }

  Future<void> _saveMedications() async {
    final prefs = await SharedPreferences.getInstance();
    final medsJson =
        jsonEncode(medications.map((m) => m.toMap()).toList());
    await prefs.setString('medications', medsJson);
  }

  tz.TZDateTime _nextInstanceOfTime(String timeStr) {
    final parts = timeStr.split(':');
    final now = tz.TZDateTime.now(tz.local);
    tz.TZDateTime scheduledDate = tz.TZDateTime(
        tz.local, now.year, now.month, now.day, int.parse(parts[0]), int.parse(parts[1]));
    if (scheduledDate.isBefore(now)) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }
    return scheduledDate;
  }

  Future<void> _scheduleNotifications(Medication med) async {
  import 'package:timezone/timezone.dart' as tz;
    await flutterLocalNotificationsPlugin.cancelAll();

    for (var timeStr in med.times) {
      var androidDetails = const AndroidNotificationDetails(
          'med_channel_id', 'Medicações',
          channelDescription: 'Lembretes de medicações',
          importance: Importance.max,
          priority: Priority.high);

      var platformDetails = NotificationDetails(android: androidDetails);

await flutterLocalNotificationsPlugin.zonedSchedule(          timeStr.hashCode,          'Hora de tomar ${med.name}',          'Dosagem: ${med.dosage}',          tz.TZDateTime.from(scheduledTime, tz.local),          platformDetails,          androidAllowWhileIdle: true,          uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.wallClockTime,          matchDateTimeComponents: DateTimeComponents.time      );
    }
  }

  void _openMedicationForm({Medication? med}) {
    final nameController = TextEditingController(text: med?.name ?? '');
    final dosageController = TextEditingController(text: med?.dosage ?? '');
    final frequencyController =
        TextEditingController(text: med?.frequency.toString() ?? '1');
    final notesController = TextEditingController(text: med?.notes ?? '');
    List<String> times = med?.times.toList() ?? ['08:00'];

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(builder: (context, setStateSB) {
          void addTime() {
            setStateSB(() {
              times.add('08:00');
            });
          }

          void removeTime(int index) {
            setStateSB(() {
              times.removeAt(index);
            });
          }

          void updateTime(int index, TimeOfDay newTime) {
            final formatted =
                '${newTime.hour.toString().padLeft(2, '0')}:${newTime.minute.toString().padLeft(2, '0')}';
            setStateSB(() {
              times[index] = formatted;
            });
          }

          return AlertDialog(
            title: Text(med == null ? 'Adicionar Medicamento' : 'Editar Medicamento'),
            content: SingleChildScrollView(
              child: Column(
                children: [
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Nome'),
                  ),
                  TextField(
                    controller: dosageController,
                    decoration: const InputDecoration(labelText: 'Dosagem'),
                  ),
                  TextField(
                    controller: frequencyController,
                    decoration:
                        const InputDecoration(labelText: 'Frequência (vezes por dia)'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 10),
                  const Text('Horários:'),
                  ListView.builder(
                    shrinkWrap: true,
                    itemCount: times.length,
                    itemBuilder: (context, index) {
                      final time = times[index];
                      final parts = time.split(':');
                      final initialTime = TimeOfDay(
                          hour: int.parse(parts[0]), minute: int.parse(parts[1]));
                      return Row(
                        children: [
                          Expanded(
                            child: TextButton(
                              child: Text(times[index]),
                              onPressed: () async {
                                final picked = await showTimePicker(
                                    context: context, initialTime: initialTime);
                                if (picked != null) {
                                  updateTime(index, picked);
                                }
                              },
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete),
                            onPressed: () {
                              removeTime(index);
                            },
                          )
                        ],
                      );
                    },
                  ),
                  TextButton.icon(
                    onPressed: addTime,
                    icon: const Icon(Icons.add),
                    label: const Text('Adicionar horário'),
                  ),
                  TextField(
                    controller: notesController,
                    decoration: const InputDecoration(labelText: 'Observações'),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancelar'),
              ),
              ElevatedButton(
                onPressed: () {
                  final id = med?.id ?? DateTime.now().millisecondsSinceEpoch.toString();
                  final name = nameController.text.trim();
                  final dosage = dosageController.text.trim();
                  final frequency = int.tryParse(frequencyController.text) ?? 1;
                  final notes = notesController.text.trim();

                  if (name.isEmpty || dosage.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Nome e dosagem são obrigatórios')));
                    return;
                  }

                  final newMed = Medication(
                    id: id,
                    name: name,
                    dosage: dosage,
                    frequency: frequency,
                    times: times,
                    notes: notes.isEmpty ? null : notes,
                  );

                  setState(() {
                    if (med == null) {
                      medications.add(newMed);
                    } else {
                      final index = medications.indexWhere((m) => m.id == med.id);
                      if (index >= 0) medications[index] = newMed;
                    }
                  });

                  _saveMedications();
                  _scheduleNotifications(newMed);
  import 'package:timezone/timezone.dart' as tz;

                  Navigator.pop(context);
                },
                child: const Text('Salvar'),
              )
            ],
          );
        });
      },
    );
  }

  void _deleteMedication(String id) {
    setState(() {
      medications.removeWhere((m) => m.id == id);
    });
    _saveMedications();
    flutterLocalNotificationsPlugin.cancelAll();
    for (var med in medications) {
      _scheduleNotifications(med);
  import 'package:timezone/timezone.dart' as tz;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Medicamentos'),
      ),
      body: ListView.builder(
        itemCount: medications.length,
        itemBuilder: (context, index) {
          final med = medications[index];
          return ListTile(
            title: Text(med.name),
            subtitle: Text('${med.dosage} - ${med.frequency}x ao dia'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () => _openMedicationForm(med: med),
                ),
                IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: () => _deleteMedication(med.id),
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openMedicationForm(),
        child: const Icon(Icons.add),
      ),
    );
  }
}

