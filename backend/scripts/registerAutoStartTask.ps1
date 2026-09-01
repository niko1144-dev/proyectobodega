# Registrar Tarea Programada de Windows para Inicio Automático al Arrancar el Servidor
$taskName = "ITAM-ChileAtiende-AutoStart"

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c pm2 resurrect"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 365) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM" -Force
    Write-Host "✅ Tarea programada '$taskName' registrada exitosamente para arranque automático con SYSTEM."
} catch {
    Write-Warning "Intentando registrar con usuario actual..."
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User "$env:USERDOMAIN\$env:USERNAME" -Force
    Write-Host "✅ Tarea programada '$taskName' registrada exitosamente con usuario $env:USERNAME."
}
