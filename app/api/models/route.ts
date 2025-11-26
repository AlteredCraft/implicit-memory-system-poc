import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
    try {
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const models = await anthropic.models.list();

        // Filter and format the models to only include relevant ones
        const supportedModels = models.data
            .filter(model =>
                model.id.includes('claude') &&
                (model.id.includes('sonnet') ||
                    model.id.includes('opus') ||
                    model.id.includes('haiku'))
            )
            .map(model => ({
                id: model.id,
                name: model.display_name || model.id.split('/').pop()?.replace(/-/g, ' ') || model.id,
            }));

        return NextResponse.json({ models: supportedModels });
    } catch (error) {
        console.error('Error fetching models:', error);
        return NextResponse.json(
            { error: 'Failed to fetch models' },
            { status: 500 }
        );
    }
}
