import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
  );
  runApp(const AttendanceApp());
}

class AttendanceApp extends StatelessWidget {
  const AttendanceApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'نظام الدوام',
    theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.blue),
    home: const Directionality(textDirection: TextDirection.rtl, child: AttendancePage()),
  );
}

class AttendancePage extends StatefulWidget {
  const AttendancePage({super.key});
  @override State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  final employee = TextEditingController();
  DateTime start = DateTime(2026,7,26), end = DateTime(2026,8,25);
  final Map<String, TimeOfDay?> ins = {}, outs = {};
  String message = '';
  String key(DateTime d) => '${d.year.toString().padLeft(4,'0')}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}';
  List<DateTime> get dates { final r=<DateTime>[]; for(var d=start; !d.isAfter(end); d=d.add(const Duration(days:1))) r.add(d); return r; }
  int mins(TimeOfDay? a, TimeOfDay? b){ if(a==null||b==null)return 0; var x=a.hour*60+a.minute,y=b.hour*60+b.minute; if(y<=x)y+=1440; return y-x; }
  int get total => dates.where((d)=>d.weekday!=DateTime.friday).fold(0,(s,d)=>s+mins(ins[key(d)],outs[key(d)]));
  Future<void> pick(DateTime d,bool entry) async { final t=await showTimePicker(context: context, initialTime: entry?const TimeOfDay(hour:6,minute:0):const TimeOfDay(hour:14,minute:0)); if(t!=null)setState(()=>entry?ins[key(d)]=t:outs[key(d)]=t); }
  Future<void> save() async { if(employee.text.trim().isEmpty){setState(()=>message='اكتب اسم الموظف');return;} final rows=dates.where((d)=>d.weekday!=DateTime.friday).where((d)=>ins[key(d)]!=null||outs[key(d)]!=null).map((d)=>{'employee_name':employee.text.trim(),'work_date':key(d),'check_in':ins[key(d)]==null?null:'${ins[key(d)]!.hour.toString().padLeft(2,'0')}:${ins[key(d)]!.minute.toString().padLeft(2,'0')}:00','check_out':outs[key(d)]==null?null:'${outs[key(d)]!.hour.toString().padLeft(2,'0')}:${outs[key(d)]!.minute.toString().padLeft(2,'0')}:00'}).toList(); await Supabase.instance.client.from('attendances').upsert(rows,onConflict:'employee_name,work_date'); setState(()=>message='تم الحفظ في Supabase'); }
  @override Widget build(BuildContext context){ return Scaffold(appBar:AppBar(title:const Text('نظام حساب دوام الموظفين')),body:ListView(padding:const EdgeInsets.all(16),children:[TextField(controller:employee,decoration:const InputDecoration(labelText:'اسم الموظف',border:OutlineInputBorder())),const SizedBox(height:12),Wrap(spacing:12,runSpacing:12,children:[Card(child:Padding(padding:const EdgeInsets.all(16),child:Text('إجمالي الحضور: ${total~/60}س ${total%60}د'))),Card(child:Padding(padding:const EdgeInsets.all(16),child:Text('أيام العمل: ${(total/480).toStringAsFixed(6)}'))),FilledButton(onPressed:save,child:const Text('حفظ في Supabase')),Text(message)]),const SizedBox(height:12),...dates.map((d){final friday=d.weekday==DateTime.friday,m=mins(ins[key(d)],outs[key(d)]);return Card(child:ListTile(title:Text('${key(d)}${friday?' — الجمعة':''}'),subtitle:friday?const Text('إجازة الجمعة'):Text(m==0?'لم يتم الإدخال':'${m~/60}س ${m%60}د = ${(m/480).toStringAsFixed(6)} يوم'),trailing:friday?null:Wrap(spacing:8,children:[OutlinedButton(onPressed:()=>pick(d,true),child:Text(ins[key(d)]?.format(context)??'الحضور')),OutlinedButton(onPressed:()=>pick(d,false),child:Text(outs[key(d)]?.format(context)??'الانصراف'))])));})])); }
}
