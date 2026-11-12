import type { DpMinimOffer } from "../../src/lib/dsf";
export const notes = ["Catatan: DP Minim ini wajib tenor 5 tahun (60 bulan).", "Untuk DP Minim, wajib konfirmasi kembali ke PIC Leasing Officer.", "Hasil akhir mengikuti persetujuan leasing."];
export const offers: DpMinimOffer[] = [
 {leasing:"BCA",available:true,minimum_dp:5_000_000,installment:6_170_000},
 {leasing:"MUF",available:true,minimum_dp:4_400_000,installment:6_869_000},
 {leasing:"BFI",available:true,minimum_dp:5_000_000,installment:8_050_000},
];
