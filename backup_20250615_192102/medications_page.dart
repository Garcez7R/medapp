import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;

class MedicationsPage extends StatefulWidget {
  @override
  _MedicationsPageState createState() => _MedicationsPageState();
}

class _MedicationsPageState extends State<MedicationsPage> {
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  final TextEditingController _nameController = TextEditingController();
  final List<Map<String, dynamic>> medications = [];
  TimeOfDay? _selectedTime;

  @override
  void initState() {
    super.initState();
    final initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    final initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid);
    flutterLocalNotificationsPlugin.initialize(initializationSettings);
  }

  Future<void> _scheduleNotification(String name, TimeOfDay time) async {
    final now = TimeOfDay.now();
    final today = DateTime.now();
    final scheduledDate = DateTime(today.year, today.month, today.day,
        time.hour, time.minute);
    final scheduledTZDateTime =
        tz.TZDateTime.from(scheduledDate, tz.local).add(Duration(seconds: 1));

    await flutterLocalNotificationsPlugin.zonedSchedule(
      0,
      'Hora do medicamento',
      'Tomar $name',
      scheduledTZDateTime,
      const NotificationDetails(
        android: AndroidNotificationDetails('meds_channel', 'Medicações'),
      ),
      androidAllowWhileIdle: true,
      matchDateTimeComponents: DateTimeComponents.time,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  void _addMedication() {
    final name = _nameController.text;
    final time = _selectedTime;
    if (name.isNotEmpty && time != null) {
      setState(() {
        medications.add({'name': name, 'time': time});
        _scheduleNotification(name, time);
        _nameController.clear();
        _selectedTime = null;
        Navigator.of(context).pop();
      });
    }
  }

  Future<void> _selectTime(BuildContext context) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      setState(() {
        _selectedTime = picked;
      });
    }
  }

  void _showAddMedicationDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Adicionar Medicação'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameController,
              decoration: InputDecoration(labelText: 'Nome'),
            ),
            SizedBox(height: 16),
            Text(
              _selectedTime != null
                  ? 'Horário: ${_selectedTime!.format(context)}'
                  : 'Nenhum horário selecionado',
            ),
            TextButton(
              onPressed: () => _selectTime(context),
              child: Text('Selecionar Horário'),
            ),
          ],
        ),
        actions: [
          ElevatedButton(onPressed: _addMedication, child: Text('Salvar')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Minhas Medicações')),
      body: ListView.builder(
        itemCount: medications.length,
        itemBuilder: (ctx, index) {
          final med = medications[index];
          final time = med['time'] as TimeOfDay;
          return ListTile(
            title: Text(med['name']),
            subtitle: Text('Horário: ${time.format(context)}'),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddMedicationDialog,
        child: Icon(Icons.add),
      ),
    );
  }
}
