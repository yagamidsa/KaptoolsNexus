Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "kaptools-backend.exe", 0, False
WScript.Sleep 3000
WshShell.Run "kaptools-nexus.exe", 1, False