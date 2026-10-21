# Windows Scheduled Task Registration for Park Street Operations Supervisor
# Enables automatic restart upon Windows logon/startup.

$taskName = "ParkStreetOperations24x7Supervisor"
$scriptPath = "d:\slack\park-street-operations\src\supervisor.js"
$nodePath = (Get-Command node.exe).Source

Write-Host "Configuring Windows Autostart Task: $taskName" -ForegroundColor Cyan
Write-Host "Node Executable: $nodePath"
Write-Host "Supervisor Script: $scriptPath"

# Action: launch node src/supervisor.js with working directory set to project
$action = New-ScheduledTaskAction -Execute $nodePath -Argument "`"$scriptPath`"" -WorkingDirectory "d:\slack\park-street-operations"

# Trigger: At user logon with 15-second delay to ensure network stack is ready
$trigger = New-ScheduledTaskTrigger -AtLogOn
$trigger.Delay = 'PT15S'

# Settings: restart on failure, run indefinitely
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0 -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1)

try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Park Street Operations 24/7 Slack Bolt & Firestore Emulator Supervisor" -Force
  Write-Host "✅ Scheduled Task successfully registered: $taskName" -ForegroundColor Green
  Write-Host "The application will now automatically launch 15 seconds after you log in to Windows."
} catch {
  Write-Warning "Could not register scheduled task: $_. Please run PowerShell as Administrator if permission denied."
}
