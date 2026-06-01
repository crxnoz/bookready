<?php

namespace App\Http\Controllers\Api;

use App\Models\MarketingLead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class MarketingLeadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'  => 'required|email|max:255',
            'source' => 'nullable|string|max:64',
        ]);

        // firstOrCreate so duplicate submissions silently succeed rather
        // than returning a 422 that would confuse the visitor.
        MarketingLead::firstOrCreate(
            ['email' => $data['email']],
            ['source' => $data['source'] ?? 'exit-intent'],
        );

        return response()->json(['ok' => true]);
    }
}
