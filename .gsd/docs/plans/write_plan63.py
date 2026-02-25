
import pathlib

out = pathlib.Path(r"C:\CluadeCode\.gsd\docs\plans6-02-22-phase-6-3-unscheduled-tasks-and-dnd.md")

lines = []
lines.append("# Phase 6.3 — Unscheduled Tasks & @dnd-kit Drag-and-Drop")
lines.append("")
lines.append("> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.")

out.write_text("
".join(lines), encoding="utf-8")
print(f"Wrote {len(lines)} lines")
