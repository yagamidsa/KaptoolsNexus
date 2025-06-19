// Disable console on Windows for release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kaptools_nexus_lib::run()
}