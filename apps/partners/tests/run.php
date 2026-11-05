<?php
require __DIR__.'/../private/calendar.php';
require __DIR__.'/../private/statistics.php';
$count=0;
function check(bool $condition,string $label):void{global $count;if(!$condition)throw new RuntimeException($label);$count++;}
$tz=new DateTimeZone('Europe/Warsaw');
foreach([
 ['2026-11-30 23:59:59',0,'upcoming'],['2026-12-01 00:00:00',1,'active'],
 ['2026-12-10 12:00:00',10,'active'],['2026-12-24 00:00:00',24,'active'],
 ['2026-12-26 23:59:59',24,'active'],['2026-12-27 00:00:00',0,'ended'],
] as [$date,$available,$phase]){
 $state=campaignState(new DateTimeImmutable($date,$tz));check($state['available']===$available,$date);check($state['phase']===$phase,$phase);
 $tasks=availableTasks(require __DIR__.'/../private/tasks.php',$state);check(count($tasks)===$available,'Task leak');
}
check(campaignState(new DateTimeImmutable('2026-11-30T23:00:00Z'))['available']===1,'Warsaw midnight in UTC');
$all=require __DIR__.'/../private/tasks.php';check(array_keys($all)===range(1,24),'24 tasks');
foreach($all as $t)check($t['title']!==''&&$t['body']!=='','Nonempty task');
foreach([['from'=>'2026-12-20','to'=>'2026-12-01'],['from'=>'2026-12-27'],['from'=>[]]]as $input){try{reportRange($input);check(false,'Range accepted');}catch(InvalidArgumentException $e){check(true,'Range rejected');}}
$config=['stats_source'=>'mock'];
$full=reportData('2026-12-01','2026-12-26');$half=reportData('2026-12-01','2026-12-10');
check($full['opens']===array_sum(array_column($full['daily'],'opens')),'Aggregate reconciliation');
check($half['opens']<$full['opens'],'Filter applied');check($half['windows'][11]===0,'No premature mock openings');
echo "PHP: $count assertions OK\n";
